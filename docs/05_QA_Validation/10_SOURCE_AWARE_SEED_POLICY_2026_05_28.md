# [QA] Source-aware Seed 정책 검증
> Created: 2026-05-28 03:27
> Last Updated: 2026-05-28 10:43

- **레이어**: 05_QA_Validation
- **상태**: Seed Policy QA v1.3 완료
- **범위**: `src/lib/db/seed.ts`가 hash-backed 매칭 정리 후보를 어떤 테이블에 넣고, 사용자 추천 노출을 어떻게 차단하는지 검증한다.
- **결론**: hash-backed 7개 상품은 실제 추천 상품으로 활성화하지 않고, source-aware 매칭 키워드 정리 후보로만 seed에 반영한다. 기존 active demo 상품 5개는 서비스 흐름 보존용으로 유지한다.

---

## 1. 검증 대상

| 대상 | 파일 |
|---|---|
| Seed 구현 | `src/lib/db/seed.ts` |
| 매칭 키워드 정리 입력 | `data/insurance/latest_seed_candidate_review.json` |
| 보험료 정책 | `docs/04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md` |
| 로드맵 연결 | `docs/04_Logic_Progress/ROADMAP.md` |

이 문서는 PR #7 seed 정책과 추천 노출 차단 기준을 검증한 기록이다. 실제 Turso DB 적용 결과는 `11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md`에 별도로 기록한다.

---

## 2. Seed 정책 결과

| 테이블 | Seed row | 상태 | 사용자 추천 영향 |
|---|---:|---|---|
| `insurance_carriers` | 7 | 활성 보험사 메타데이터 | 직접 추천 영향 없음 |
| `insurance_product_sources` | 7 | 모두 `review_status=needs_review` | 추천 노출 없음 |
| `insurance_source_documents` | 12 | 모두 `usage_status=link_only`, `parse_status=not_parsed` | 추천 노출 없음 |
| `insurance_products` | 5 | 기존 demo 상품 active 유지 | 기존 데모 추천 유지 |

한화생명 e암보험 약관 PDF는 `sourceUrl`에서 다시 다운로드해 파일 hash를 재계산했다.

| 문서 | 검증값 |
|---|---|
| `doc_hanwha_life_e_cancer_terms_202604` | `918796d28b8274195258621c08c32c87159c18b1a50fb6e6f653a8c42ba8f7ed` |
| 파일 크기 | 3,661,413 bytes |
| 파일 식별 | PDF 1.4, 181 pages |

`seed.ts`에는 `fileHashSha256`이 64자 lowercase hex인지 확인하는 가드를 추가했다. seed 실행 시 잘린 SHA-256 값이 남아 있으면 DB insert 전에 실패한다.

실제 상품 후보를 `insurance_products`에 넣지 않은 이유는 다음과 같다. 여기서 `review_status=needs_review`는 외부 승인 대기가 아니라 DNA risk target 매칭을 위한 키워드 정리가 아직 남았다는 뜻이다.

- 매칭 키워드 정리 결과 `current_insurance_products_seed_ready_count=0`이다.
- 한화생명 후보의 `premium_text=0원`은 대표 월 보험료로 사용할 수 없다.
- 암보험 후보는 암 급부 차이, 면책기간, 감액기간 caveat 정리가 아직 남아 있다.
- 실손의료보험 후보는 유전자 위험 특화 추천이 아니라 baseline 보장으로만 다뤄야 한다.
- 삼성생명 입원 건강보험은 현재 `coverage_category` enum에 자연스럽게 들어가지 않는다.
- 조건별 보험료는 나이, 성별, 납입기간, 보장금액별 quote matrix로 별도 수집해야 한다.

---

## 3. 보험료 처리 검증

| 항목 | 검증 결과 |
|---|---|
| `premium_text` | 원문 표시값을 source row에 보존 |
| `monthly_premium_krw` | 숫자로 정규화 가능한 값만 저장. `0원`은 대표 보험료로 저장하지 않음 |
| `premium_basis` | 모든 상품 후보에 대표 보험료 caveat 또는 차단 사유를 기록 |
| `monthly_premium_usdc` | 실제 후보에는 적용하지 않음. active 추천 상품 발행 시 별도 환산 기준 필요 |
| 조건별 가격 | 이번 PR 범위 밖. `insurance_premium_quotes` 설계와 재조회 PoC가 다음 단계 |

사용자 화면에 실제 상품 후보가 노출되지 않으므로, 현재 단계에서는 개인 맞춤 확정 견적처럼 보일 위험을 차단한다.

---

## 4. 검증 명령

| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npx eslint src/lib/db/seed.ts` | 통과 |
| `npx eslint src --quiet` | 통과 |
| `node -e "...fileHashSha256..."` | `seed.ts`의 모든 source document hash 64자 hex 통과 |

정책 검증 시점에는 DB 쓰기 명령인 `npx tsx src/lib/db/seed.ts`를 실행하지 않았다. 이후 백업 후 Turso DB 적용을 완료했으며, 적용 결과는 `11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md`를 기준으로 확인한다.

참고로 `npm run lint -- --quiet`는 로컬 전용 `.agent/`와 `.claude/worktrees/` 디렉터리까지 스캔해 PR 범위 밖 오류로 실패했다. PR 검증 기준은 repository source인 `src` 범위로 확인했다.

---

## 5. 남은 리스크

| 리스크 | 대응 |
|---|---|
| `onConflictDoNothing()` 때문에 기존 row가 갱신되지 않을 수 있음 | 정기 갱신 파이프라인에서는 seed가 아니라 별도 upsert/refresh 스크립트로 관리 |
| source 후보가 많아져도 추천 엔진이 읽지 않음 | 매칭 키워드 정리가 끝난 상품만 별도 PR에서 `insurance_products` snapshot으로 발행 |
| 대표 보험료와 조건별 보험료가 혼동될 수 있음 | `premium_basis` caveat 유지, 다음 단계에서 `insurance_premium_quotes` 분리 |
| 삼성생명 입원 건강보험 category 미정 | `hospitalization` 또는 `general_health` 추가 여부를 별도 스키마 PR에서 결정 |

---

## 6. 다음 검증

1. 보험다모아/보험사 페이지에서 나이와 성별 파라미터 재조회 가능성을 PoC로 확인한다.
2. `insurance_premium_quotes` schema/migration 초안을 작성한다.
3. 나머지 49개 P0 후보의 공식 문서 hash와 매칭 키워드를 정리한다.
4. 매칭 키워드가 정리된 실제 상품만 `insurance_products` active snapshot으로 발행하고 기존 demo 상품 제거 시점을 정한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 출처 후보를 DB seed 경로에 올리되 매칭 키워드 정리 전 추천 노출을 차단한다 |
| Potential Impact | 실제 보험상품 카탈로그를 운영 가능한 매칭 키워드 정리 파이프라인으로 전환한다 |
| Novelty | PDF hash 기반 공식 출처와 유전자 위험 매칭의 경계를 분리한다 |
| UX | 사용자는 아직 조건이 불명확한 보험료를 확정 견적으로 오해하지 않는다 |
| Open-source | 다른 빌더가 source row와 active 추천 row를 분리하는 패턴을 재사용할 수 있다 |
| Business Plan | 보험 비교/중개 서비스로 가기 위한 판매상태, 가격, caveat, 매칭 키워드 정리 단계를 명확히 한다 |

---

## 8. Related Documents

- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 구현 순서와 Phase 2 Track A 상태
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그와 NEAR 기술 적용 전략
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote matrix 분리 정책
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog DB 필드
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - DNA risk target과 보험상품 보장 키워드 매칭 기준
- **QA_Validation**: [Hash-backed Matching Keyword Review](./08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - 7개 상품 매칭 키워드 정리와 seed 차단 근거
- **QA_Validation**: [DB Migration 0004/0005](./09_DB_MIGRATION_0004_0005_2026_05_28.md) - source-aware catalog schema 적용 검증
- **QA_Validation**: [Source-aware Seed DB Apply](./11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md) - Turso DB seed 적용 결과와 row count 검증
- **Data**: [Latest Seed Candidate Review JSON](../../data/insurance/latest_seed_candidate_review.json) - seed 후보 원천 데이터
