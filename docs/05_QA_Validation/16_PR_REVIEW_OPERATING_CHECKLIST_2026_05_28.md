# [QA] PR Review Operating Checklist
> Created: 2026-05-28 22:49
> Last Updated: 2026-05-28 22:49

- **레이어**: 05_QA_Validation
- **상태**: Active Checklist
- **범위**: PR 리뷰, DB 적용, 문서 동기화, 보안 위생, 머지 전 검증 기준
- **결론**: PR #1~#12에서 반복 확인한 리뷰 기준을 다음 세션의 기본 운영 체크리스트로 고정한다. 특히 DB schema drift, 원문 hash, 공개 저장소 보안 노출, DB write 전 백업, merge commit 방식은 머지 전 필수 확인 항목이다.

---

## 1. 적용 배경

2026-05-28 세션에서는 보험 카탈로그, source-aware seed, quote matrix schema, Turso DB 적용, quote row 적재까지 PR 12건을 검토했다.

이 과정에서 다음 종류의 이슈가 실제로 발견되고 수정됐다.

| 유형 | 발견 사례 | 후속 기준 |
|---|---|---|
| Drizzle schema drift | schema.ts index가 migration SQL/snapshot에 누락 | `drizzle-kit check`만 믿지 않고 generated migration diff를 확인 |
| Hash 결함 | 58자 SHA-256 값이 seed에 남음 | source document hash는 64자 lowercase hex와 실제 원문 재계산을 확인 |
| 보안 노출 | 공개 문서에 Turso DB URL 실제 host 노출 가능 | 공개 저장소 문서에는 DB URL/token/host를 마스킹 |
| React lint | 기존 `DnaBackground.tsx` Hook 순서 오류 | PR 범위 밖이어도 main을 red로 만드는 실제 버그는 별도 fix PR 권장 |
| DB write 안전 | migration/seed/quote row 적용 전 DB 백업 필요 | Turso write 전 읽기 전용 dump와 SHA-256 기록 |
| 데이터 상태 혼동 | 실제 상품 후보와 추천 노출 상품 혼동 | source 후보는 `needs_review`, 추천 snapshot은 별도 승격 |

---

## 2. 기본 PR 운영 규칙

| 항목 | 기준 |
|---|---|
| 작업 시작 | `main` 동기화와 clean worktree 확인 후 새 브랜치 생성 |
| 커밋 | Conventional Commits, 한글 설명 사용 |
| PR 생성 | 하나의 논리적 묶음 단위로 생성. 단일 커밋일 필요는 없음 |
| PR 머지 | 사용자 승인 전 머지 금지 |
| 머지 방식 | 기본은 merge commit. 과거 #1~#2 squash는 예외 이력으로만 유지 |
| PR 후 정리 | 머지 후 `main` 동기화, 원격 브랜치 삭제 확인, stale remote-tracking ref prune |
| 배포 확인 | Vercel check 또는 배포 상태 확인 |

---

## 3. 머지 전 필수 확인

| 검사 | 명령 또는 방법 | Pass 기준 |
|---|---|---|
| 로컬 상태 | `git status --short --branch` | 대상 브랜치와 변경 파일이 의도와 일치 |
| PR 상태 | `gh pr view <번호> --json mergeable,mergeStateStatus` | `MERGEABLE`, `CLEAN` |
| PR checks | `gh pr checks <번호>` | Vercel pass. skipping 항목은 성격 확인 |
| TypeScript | `npx tsc --noEmit` | exit 0 |
| 앱 lint | `npx eslint src --quiet` | exit 0 |
| 변경 script lint | `npx eslint <script> --quiet` | exit 0 |
| Build | `npm run build` | exit 0 |
| Diff hygiene | `git diff --check` | whitespace error 0 |

`npm run lint -- --quiet`는 현재 저장소 내부 `.agent`와 `.claude/worktrees`까지 스캔해 외부 작업물 오류를 낼 수 있다. 전체 lint가 실패하면 PR 범위의 script lint와 `src` lint를 별도로 실행하고, 실패 원인이 PR 변경인지 기존 로컬 작업물인지 구분한다.

---

## 4. Drizzle/DB Schema 리뷰 기준

| 항목 | 기준 |
|---|---|
| Schema 변경 | `src/lib/db/schema.ts`와 기술 명세 문서가 같은 테이블/컬럼/enum을 설명해야 한다 |
| Migration 생성 | schema 변경 후 `drizzle-kit generate` 산출물이 실제 변경을 포함하는지 확인 |
| Index drift | schema의 `index(...)`가 SQL migration과 snapshot에 들어갔는지 확인 |
| `drizzle-kit check` 해석 | migration 파일과 snapshot 정합성 검사일 뿐, schema와 snapshot drift를 완전히 잡는 도구로 보지 않는다 |
| 적용 기록 | 운영 DB 적용은 별도 QA 문서에 백업, 명령, row count, index 검증을 남긴다 |
| destructive 가능성 | 기존 row/컬럼 삭제, 타입 변경, 제약 강화 전에는 반드시 백업과 영향 분석을 먼저 수행 |

---

## 5. Turso DB Write 기준

| 단계 | 필수 항목 |
|---|---|
| 적용 전 | `.env.local` 대상 DB 확인, DB URL 공개 금지, 읽기 전용 dump 백업 |
| 백업 기록 | 백업 파일 경로, SHA-256, 적용 전 row count |
| 적용 | migration/seed/apply script 실행 결과를 그대로 기록 |
| 적용 후 | row count, index, invalid hash, duplicate key 등 검증 |
| 문서화 | `docs/05_QA_Validation`에 적용 기록 생성 |
| 공개 저장소 보안 | 문서에는 `libsql://***.turso.io`처럼 마스킹. token, 실제 DB host, secret 값 금지 |

---

## 6. 보험 데이터 리뷰 기준

| 데이터 | 기준 |
|---|---|
| 원문 문서 hash | SHA-256은 64자 lowercase hex. 가능하면 실제 PDF/HTML 응답으로 재계산 |
| 상품 source row | 공식 출처와 문서 hash가 있어도 기본은 `needs_review` |
| 추천 snapshot | `coverage_category`, `risk_targets`, `matching_strategy`, caveat가 정리된 뒤 별도 승격 |
| 보험료 대표값 | `premium_text`와 `monthly_premium_krw`는 공식 비교 조건 기준 예시 가격 |
| 조건별 quote row | `insurance_premium_quotes`에 보관하고 기본 상태는 `needs_review` |
| 사용자 표시 | 확정 견적, 보험사 심사 결과, 가입 보장으로 표현하지 않는다 |
| 실손의료보험 | 특정 DNA risk target 상품이 아니라 baseline/medical_expense 트랙으로 분리 |

---

## 7. 보안 및 공개 저장소 위생

| 항목 | 금지 또는 주의 |
|---|---|
| DB URL/token | 실제 host와 token을 문서/PR body/로그에 공개하지 않는다 |
| `.env.local` | 커밋 금지 |
| 로컬 에이전트 폴더 | `.agent/`, `.codex/`, `.claude/worktrees/`는 PR 변경 범위로 보지 않는다 |
| 백업 파일 | `/private/tmp` 등 로컬 복구용 경로에만 두고 Git에 포함하지 않는다 |
| 원문 PDF | 재배포 정책 확정 전에는 hash/link 중심으로 보존 |

---

## 8. PR Review Response 형식

리뷰 응답은 다음 순서로 작성한다.

1. 결론: approve, approve with required change, request changes 중 하나로 요약
2. Must-fix: 머지 전 반드시 고쳐야 하는 항목
3. Should-fix 또는 질문: 설계 확인이 필요한 항목
4. Nits: 선택 개선
5. 검증 결과: 실행한 명령과 outcome
6. 남은 리스크: PR 범위 밖이지만 main에 영향을 줄 수 있는 항목

중요한 발견은 “PR 범위 밖”이어도 숨기지 않는다. 다만 해당 PR이 만든 문제가 아니면 별도 PR로 분리하는 것을 우선한다.

---

## 9. 다음 세션 기본값

| 항목 | 기본값 |
|---|---|
| 새 작업 | 새 브랜치에서 시작 |
| PR 머지 | 사용자 승인 후 merge commit |
| DB write | 백업 먼저, 문서 기록 포함 |
| 보험상품 추천 | source 후보와 active 추천 snapshot 분리 |
| quote row | `needs_review` 유지 후 승인 기준 별도 정의 |
| 문서 | 코드/DB 상태가 바뀌면 관련 Technical/Logic/QA 문서 동시 업데이트 |

---

## 10. Related Documents

- **Concept_Design**: [Genetic AI Insurance Agent](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md) - 프로젝트 비즈니스 비전
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험 데이터 수집과 정규화 기준
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog와 quote table 설계
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 진행 상태와 다음 작업
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품과 NEAR 기술 적용 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 관리 방침
- **QA_Validation**: [DB Migration 0004/0005](./09_DB_MIGRATION_0004_0005_2026_05_28.md) - schema/migration 적용 검증 사례
- **QA_Validation**: [Source-aware Seed DB Apply](./11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md) - DB seed 적용 검증 사례
- **QA_Validation**: [Premium Quote Rows DB Apply](./15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - quote row 적용 검증 사례
