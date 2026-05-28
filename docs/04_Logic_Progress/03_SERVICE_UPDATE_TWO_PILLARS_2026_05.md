# [실행 전략] 두 기둥 기반 서비스 업데이트 계획
> Created: 2026-05-27 02:55
> Last Updated: 2026-05-28 21:13

- **레이어**: 04_Logic_Progress
- **상태**: Draft v2.7
- **범위**: 실제 보험상품 카탈로그 적용 준비, NEAR 기술 업데이트 적용 준비
- **결론**: 서비스 적용의 두 기둥은 `실제 보험상품 탐색`과 `NEAR 프라이버시 기술 적용`이며, 두 영역은 결정론적 매칭 엔진으로 연결한다.

---

## 1. 목적

2026-05-27 기준으로 확인한 보험상품 데이터 출처와 NEAR/IronClaw 기술 업데이트를 코드에 바로 반영하기 전에, 적용 단위와 검증 순서를 문서화한다.

이번 문서는 구현 명세가 아니라 적용 준비 문서다. 따라서 코드 변경보다 먼저 다음을 고정한다.

- 어떤 출처에서 실제 보험상품 데이터를 가져올지
- 어떤 NEAR 기술 업데이트를 즉시 실측할지
- 기존 `riskProfile.flags`와 `insurance_products.risk_targets` 매칭 구조를 어떻게 유지할지
- 아직 공개 근거가 부족한 업데이트를 로드맵 전제로 삼지 않도록 경계선을 둘 것

---

## 2. 두 기둥 구조

| 기둥 | 목표 | 프로젝트 적용 지점 | 현재 판단 |
|---|---|---|---|
| Pillar A. 실제 보험상품 카탈로그 | 사용자가 실제 판매 상품을 비교할 수 있게 한다 | `insurance_product_sources`, `insurance_products`, `matchProducts`, 향후 출처 메타데이터 | 공식 공시/PDF/API 수집 파이프라인을 먼저 설계하고, MVP는 매칭 키워드가 정리된 P0 상품군부터 적용 |
| Pillar B. NEAR 프라이버시 기술 | 민감 유전자 분석과 결제를 TEE/ZKP/Confidential Intents로 보호한다 | `runAnalysis`, `zkp-prover-wasm`, IronClaw, Chain Signatures, Confidential Intents | IronClaw v0.28.2까지 재검증, USDC+Confidential Intents는 Layer 3 재설계 후보 |
| Bridge. 결정론적 매칭 | AI가 상품명을 지어내지 않고 검증 가능한 추천만 수행한다 | `riskProfile.flags` -> `insurance_products.risk_targets` | 기존 설계 유지. AI는 해석, DB는 상품 추천의 SSOT |

---

## 3. Pillar A: 실제 한국 보험상품 카탈로그

### 3-1. 우선 출처

| 출처 | 성격 | 적용 우선순위 | 사용 방식 |
|---|---|---|---|
| 생명보험협회 공시실 | 생명보험 상품 비교공시 | 높음 | 질병, 암, CI, 정기/종신 관련 상품 후보 확인 |
| 손해보험협회 공시실 | 손해보험 상품 비교공시 | 높음 | 실손의료비, 질병, 상해, 암 관련 상품 후보 확인 |
| 보험다모아 | 금융위 감독 온라인 보험슈퍼마켓 | 높음 | MVP seed의 사용자 친화적 비교 기준 확보 |
| 공공데이터포털 우체국보험 OpenAPI | 상품 메타데이터 API | 중간 | API 연동 PoC 및 정규화 샘플로 활용 |
| HIRA 보건의료빅데이터 OpenAPI | 질병 통계 API | 중간 | 유전자 위험 플래그와 질병 발생 통계의 근거 보강 |
| CODEF 등 서드파티 API | 민간 집계 API | 보류 | 계약/요금/제공 범위 확인 후 판단 |

### 3-2. MVP 적용 원칙

- 초기 seed는 공식 공시에서 확인 가능한 상품 8~12개로 제한한다.
- 상품명, 보험사, 보장 카테고리, 월 보험료 기준, 출처 URL, 확인일을 함께 기록한다.
- 보험료는 원 출처의 KRW 기준을 보존하고, `monthly_premium_usdc`는 화면 및 결제 데모를 위한 환산값으로 취급한다.
- 가입 조건은 상품별로 다르므로 데모 단계에서는 `premium_basis`를 문서화한다. 예: 40세 남성, 월납, 20년납, 갱신형 여부.
- 나이, 성별, 납입기간, 보장금액별 보험료 변화는 대표 상품 row에 넣지 않고 `insurance_premium_quotes` table로 분리한다.
- seed PR에서는 대표 보험료를 "공식 비교 조건 기준 예시 보험료"로만 표시하고, 개인 맞춤 확정 견적으로 표현하지 않는다.
- `coverage_category`는 기존 enum인 `oncology`, `cardiovascular`, `metabolic`, `neurological`에 우선 매핑한다.
- `risk_targets`는 유전자 위험 플래그와 직접 매칭되는 키만 넣는다. 상품 설명 문구를 AI가 임의로 확장하지 않는다.
- 매칭 키워드 정리 전 상품은 `insurance_products`의 active 추천 row가 아니라 `insurance_product_sources`와 `insurance_source_documents`에 먼저 보관한다.
- 여기서 말하는 정리는 보험상품의 외부 승인이나 품질 심사가 아니라, DNA risk target과 연결할 `coverage_category`, `risk_targets`, `matching_strategy`, caveat를 정리하는 작업이다.
- 현재 hash-backed 7개 상품은 모두 `review_status=needs_review`로 보관하며, 기존 active demo 상품은 실제 상품의 매칭 키워드 정리 완료 전까지 서비스 흐름 보존용으로 유지한다.
- 2026-05-28 quote matrix PoC에서 암보험은 나이/성별 재조회, 실손의료보험은 남성 나이별 재조회가 가능함을 확인했다. 실손의료보험 여성 조건은 현재 파라미터로 HTTP 500을 반환하므로 후속 확인이 필요하다.
- 2026-05-28 21:12 KST 기준 PoC raw quote 66건 중 source-aware 후보와 매칭되는 16건을 `insurance_premium_quotes.review_status=needs_review`로 적재했다. source catalog 미등록 50건은 원천 상품 후보 확장 후 재처리한다.

### 3-3. 구현된 스키마 확장

2026-05-28 기준 Drizzle schema와 migration SQL에 아래 필드를 반영했다. 실제 DB 적용은 백업/검토 후 진행하며, 전체 수집 파이프라인은 `01_INSURANCE_DATA_COLLECTION_PIPELINE.md`를 기준으로 한다.

| 후보 필드 | 목적 |
|---|---|
| `source_type` | `association`, `e_insmarket`, `carrier_disclosure`, `data_go_kr`, `postal_api`, `manual` 등 출처 구분 |
| `source_url` | 공시 또는 비교 페이지 원문 링크 |
| `source_checked_at` | 상품 정보 확인일 |
| `premium_currency` | 원 보험료 통화. 국내 상품은 기본 `KRW` |
| `premium_basis` | 보험료 산정 조건 |
| `monthly_premium_krw` | 실제 공시 보험료 원화 값 |
| `catalog_status` | `approved`, `needs_review`, `archived` |
| `insurance_premium_quotes` | 나이, 성별, 납입기간, 보장금액별 보험료 matrix |

### 3-4. 2026-05-28 source-aware seed 적용 기준

이번 적용은 실제 상품을 사용자 추천으로 활성화하는 작업이 아니라, 공식 출처 후보를 DB seed 경로에 올리는 작업이다.

| 대상 | 적용 방식 | 사용자 추천 노출 |
|---|---|---|
| 7개 보험사 | `insurance_carriers` seed row | 직접 노출 없음 |
| 7개 hash-backed 매칭 정리 후보 | `insurance_product_sources` seed row, `review_status=needs_review` | 노출 없음 |
| 12개 PDF 원문 | `insurance_source_documents` seed row, hash와 URL 보관 | 노출 없음 |
| 기존 demo 상품 5개 | `insurance_products` active row 유지 | 기존 데모 흐름 유지 |

이 기준을 둔 이유는 현재 `insurance_products`에 바로 넣을 수 있을 만큼 매칭 키워드가 정리된 실제 상품이 0개이기 때문이다. 특히 보험료 산정 기준, 판매상태, 암 급부 caveat, 실손 baseline 노출 문구가 정리되기 전에는 실제 상품명을 추천 카드에 표시하지 않는다.

---

## 4. Pillar B: NEAR 기술 업데이트 적용 준비

### 4-1. IronClaw 업데이트 판단

| 항목 | 확인 상태 | 적용 판단 |
|---|---|---|
| 로컬 CLI | `ironclaw 0.26.0` | 코드 변경 전 업그레이드 테스트 필요 |
| 공개 확인 릴리스 | v0.28.2까지 확인 | v0.27.0~v0.28.2 기능으로 블로커 2, 3을 재실측 |
| v0.29.0 / PR #3122 | 공개 근거 미확인 | 로드맵 전제에서 제외. 확인 전까지 문서에는 후보로만 기록 |
| v0.27.0 path-based credentials | per-endpoint 인증 라우팅 개선 가능성 | 블로커 1의 보조 요소일 수 있으나 TEE 내부 복호화 API를 대체하지 않음 |
| v0.28.0 WIT-compatible WASM runtime | WASM 툴 런타임 핵심 업데이트 | 블로커 2, 3의 재검증 1순위 |
| v0.28.1 memory/headless server | 멀티테넌트 격리 및 headless WASM 채널 | hosted 서버 환경 테스트 필요 |
| v0.28.2 chat-driven `tool_install` restore | 툴 설치 경로 복원 | cloud.near.ai 반영 여부 실측 필요 |

### 4-2. Phase 3 블로커 재분류

| 블로커 | 기존 판단 | 2026-05-27 재분류 |
|---|---|---|
| 1. TEE 내부 복호화 경로 | NEAR AI 확인 필요 | 여전히 확인 필요. v0.27 credentials 업데이트만으로 해결됐다고 단정 불가 |
| 2. cloud.near.ai WASM 등록 | NEAR AI 확인 필요 | v0.28.0/v0.28.2로 자체 재실측 후 문의 보강 |
| 3. WASM 실행 결과 반환 | NEAR AI 확인 필요 | WIT runtime과 externally provided tools 후보를 분리 검증. v0.29.0은 미확인 |
| 4. Stateless 파이프라인 | 부분 자체 해결 가능 | WIT host runtime 또는 Mission API로 재검토 |
| 5. Barretenberg 크기 제한 | 실측 필요 | 유지. 먼저 137KB `zkp-prover.wasm`로 cloud 실행 경로를 확정 |

### 4-3. Confidential Intents + USDC

NEAR AI의 USDC + Confidential Intents 통합은 Layer 3 결제 설계를 다시 잡을 수 있는 핵심 업데이트다.

적용 판단은 다음과 같다.

- 보험료 결제 단위는 `monthly_premium_usdc`와 자연스럽게 연결된다.
- 유전자 위험 분석 결과, 추천 상품, 결제 금액을 공개하지 않는 흐름은 프로젝트의 핵심 차별성과 일치한다.
- 기존 `@defuse-protocol/intents-sdk` 버전 충돌 이슈는 별도 실측해야 한다.
- 코드 적용 전에는 SDK, 엔드포인트, 테스트넷/메인넷 지원 범위를 확인해야 한다.

### 4-4. Chain Signatures Post-Quantum

Post-Quantum Chain Signatures는 장기 보안 로드맵에는 중요하지만, 즉시 구현 항목으로 두지 않는다.

- Q2 2026 테스트넷 예정 수준으로 관리한다.
- 현재 결제/멀티체인 설계는 기존 Chain Signatures v1 기준을 유지한다.
- PQ 서명은 보안 메시지, 투자자 설명, 6~18개월 기술 비전 항목에 반영한다.

---

## 5. Bridge: 결정론적 매칭 엔진 유지

두 기둥은 다음 순서로 연결한다.

```text
사용자 유전자 데이터
-> IronClaw TEE 분석
-> riskProfile.flags 생성
-> insurance_products.risk_targets와 교집합 계산
-> 실제 공시 기반 보험상품 추천
-> Confidential Intents/USDC 결제 후보 표시
```

핵심 원칙은 기존 `AI_MATCHING_PIPELINE.md`와 같다.

- AI는 위험 해석과 설명을 담당한다.
- 상품 추천의 SSOT는 DB다.
- AI가 실제로 존재하지 않는 보험상품명, 보험사, 보험료를 생성하지 않는다.
- 추천 결과에는 출처와 확인일을 붙인다.
- 매칭 점수는 보험상품의 `risk_targets`와 분석 결과의 `riskProfile.flags`를 기준으로 계산한다.

---

## 6. 365 Rubric 영향

| Rubric | 이번 업데이트의 의미 |
|---|---|
| Functionality | 실제 보험상품 seed와 IronClaw 재실측으로 데모를 서비스형 MVP에 가깝게 만든다 |
| Impact | 한국 보험시장 데이터와 NEAR 프라이버시 결제를 연결해 현실적 사용성을 높인다 |
| Novelty | 유전자 데이터, TEE 분석, ZKP, 기밀 결제, 실제 보험상품 추천의 결합을 명확히 한다 |
| UX | 사용자는 기술 스택을 몰라도 실제 상품과 보호된 결제 흐름을 확인할 수 있어야 한다 |
| Open-source | WASM 툴 등록/실행 검증 결과를 문서화하면 다른 NEAR 빌더가 재사용할 수 있다 |
| Business Plan | 실제 상품 카탈로그와 USDC 결제 레일이 있어야 수익 모델 논의가 가능해진다 |

---

## 7. 적용 백로그

### Track A. 실제 보험상품 카탈로그

- [x] 한국 보험사 1차 universe 확정: 생명보험협회/손해보험협회 회원사 기준
- [x] 보험상품 데이터 수집 파이프라인 명세 확정 (`01_INSURANCE_DATA_COLLECTION_PIPELINE.md`)
- [x] 공식 출처 반복 수집 Collector v1 작성 (`scripts/insurance/collect-official-sources.mjs`)
- [x] 보험다모아 기준 암, 질병, 실손, 간병/치매 중심 P0 상품군 샘플 수집
- [x] 보험다모아 product code와 공식 상품 이동 URL 추출
- [x] 대표 상품 8개 공식 페이지/PDF 후보 교차검증 PoC 수행
- [x] 보험사 공시실 PDF crawler v1 작성 및 삼성화재 실손 약관 hash 확보
- [x] DB손보 공시실 JavaScript/API adapter로 실손 약관/사업방법서/상품요약서 hash 확보
- [x] 매칭 키워드 정리 CSV v1 생성 (`latest_insurance_review_queue.csv`)
- [x] hash-backed 1차 상품 매칭 키워드 정리 후 seed 후보 반영 여부 결정
- [x] 실제 상품 seed 반영 전 `medical_expense`, KRW 보험료, 출처 hash 필드의 스키마 확장안 확정
- [x] Drizzle schema와 Zod schema에 보험 카탈로그 확장안 반영
- [x] Drizzle migration SQL 생성 (`drizzle/0004_panoramic_firebird.sql`)
- [x] DB migration 실제 적용 전 백업/검토 및 Turso 적용 완료 (`0004`, `0005`)
- [x] `matchProducts`에서 `risk_target` 추천과 `baseline` 추천 분리
- [x] 추천 카드 UI에 baseline/출처/보험료 기준/caveat 표시
- [x] 삼성생명, 현대해상, 신한라이프 공시/상품 JavaScript API adapter로 PDF 후보 보강
- [x] KB손보 공시 row의 별도 문서 다운로드 경로 보강
- [x] hash-backed 7개 상품 매칭 키워드 정리 후 catalog/baseline/schema-extension 후보 분류
- [x] 조건별 보험료 matrix는 대표 상품 컬럼이 아니라 별도 `insurance_premium_quotes` 정책으로 관리하기로 문서화
- [x] 전체 상품별 출처 URL, 확인일, 원문 hash, 보험료 산정 기준 기록
- [x] PDF 다운로드 가능성 PoC 수행
- [x] 월간/분기 정기 갱신 체크리스트 작성 (`03_INSURANCE_DATA_REFRESH_QA.md`)
- [x] source-aware seed 후보 발행 정책 확정 및 `seed.ts` 출처 후보 반영
- [x] 매칭 키워드 정리 정책 문서화 (`03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md`)
- [x] source-aware seed Turso DB 적용 및 row count 검증
- [x] 보험다모아/보험사 페이지에서 나이·성별별 보험료 재조회 가능성 PoC 수행
- [x] `monthly_premium_krw`와 `monthly_premium_usdc` 병행 저장 정책 결정: source row는 KRW, active 추천 발행 시 USDC 환산 기준 별도 승인
- [x] `insurance_premium_quotes` Drizzle schema/migration 설계
- [x] 백업 후 `0006_real_war_machine.sql` Turso DB migration 적용
- [x] P0 암보험/실손의료보험 quote row crawler 작성 및 raw row 16건 적재
- [ ] 매칭 키워드가 정리된 실제 상품 snapshot 생성 및 기존 active demo 상품 교체
- [ ] 실손의료보험 여성 조건 quote 파라미터 확인
- [ ] HIRA 질병 통계를 `risk_targets` 근거 보강 자료로 연결

### Track B. NEAR 기술 재검증

- [ ] IronClaw CLI/API를 v0.28.2 기준으로 로컬 검증
- [ ] `zkp-prover.wasm` 137KB 툴을 WIT-compatible runtime에서 실행 테스트
- [ ] `tool_install`이 cloud.near.ai hosted TEE까지 반영되는지 확인
- [ ] WASM 실행 결과가 Chat/Responses/Mission API 중 어디서 반환되는지 확인
- [ ] v0.29.0 및 PR #3122 공개 근거 확인 전까지 코드 전제에서 제외
- [ ] USDC + Confidential Intents SDK/API 실측 계획 작성

### Track C. 매칭 브리지

- [ ] 실제 상품의 보장 항목을 기존 `coverage_category` enum에 매핑
- [ ] 실제 상품의 질병/암/대사/심혈관/신경계 보장 키워드를 `risk_targets`로 정규화
- [ ] AI 설명과 DB 추천 결과의 경계를 UI에 드러내는 문구 검토
- [ ] 추천 결과에 출처, 확인일, 보험료 기준을 표시하는 UI 요구사항 작성

---

## 8. 비적용 범위

2026-05-28 01:14 KST 기준 `0004`와 `0005` Turso DB migration은 백업 후 적용 완료했다. 적용 결과는 `09_DB_MIGRATION_0004_0005_2026_05_28.md`에 기록한다.

현재 적용 범위에서는 다음을 아직 하지 않는다.

- 매칭 키워드가 정리된 실제 상품의 `insurance_products` active row 발행
- 기존 active demo 상품 제거 또는 비활성화
- 조건별 보험료 quote matrix 수집 및 DB migration
- 조건별 보험료 quote row `approved` 승격 및 사용자 UI 노출
- IronClaw CLI 업그레이드
- Confidential Intents SDK 설치 또는 교체
- NEAR AI 팀 문의 메일 발송

---

## 9. Related Documents

- **Logic_Progress**: [Roadmap](./ROADMAP.md) - Phase 2/3 적용 일정과 Stage 17/18 체크리스트
- **Logic_Progress**: [AI Matching Pipeline](./AI_MATCHING_PIPELINE.md) - AI 해석과 DB 기반 보험상품 매칭의 경계
- **Technical_Specs**: [Phase 3 Blockers and Inquiry](../03_Technical_Specs/PHASE3_BLOCKERS_AND_INQUIRY.md) - IronClaw/WASM/TEE 블로커 재검증 기준
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 한국 보험상품 수집/PDF/API 정규화 명세
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - `insurance_products`와 `insurance_premium_quotes` 현재 스키마
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 실제 보험상품 카탈로그 확장 확정안
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - DNA risk target과 보험상품 보장 키워드 매칭 기준
- **Logic_Progress**: [Premium Quote Policy](./04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix와 seed 발행 정책
- **Technical_Specs**: [Deployment Strategy](../03_Technical_Specs/DEPLOYMENT_STRATEGY.md) - Confidential Intents와 배포 전략의 기존 정리
- **QA_Validation**: [Insurance Data Refresh QA](../05_QA_Validation/03_INSURANCE_DATA_REFRESH_QA.md) - 보험상품 데이터 정기 갱신 체크리스트
- **QA_Validation**: [Insurance Data Acquisition PoC](../05_QA_Validation/04_INSURANCE_DATA_ACQUISITION_POC_2026_05_27.md) - 공식 출처 수집 가능성 검증 결과
- **QA_Validation**: [Product Document Probe](../05_QA_Validation/05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 대표 상품 공식 문서/PDF hash 검증 결과
- **QA_Validation**: [Carrier Disclosure Crawler](../05_QA_Validation/06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 보험사 공시실 crawler v1 검증 결과
- **QA_Validation**: [Insurance Matching Queue](../05_QA_Validation/07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 매칭 키워드 정리 CSV 생성 결과
- **QA_Validation**: [Hash-backed Matching Keyword Review](../05_QA_Validation/08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - hash-backed 7개 상품 매칭 키워드 정리 결과와 추천 미노출 사유
- **QA_Validation**: [Source-aware Seed Policy QA](../05_QA_Validation/10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md) - seed 후보 반영 방식과 노출 차단 검증
- **QA_Validation**: [Source-aware Seed DB Apply](../05_QA_Validation/11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md) - Turso DB seed 적용 결과와 row count 검증
- **QA_Validation**: [Premium Quote Matrix PoC](../05_QA_Validation/12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - 나이/성별 조건별 보험료 재조회 가능성 검증
- **QA_Validation**: [Premium Quotes Schema Migration](../05_QA_Validation/13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md) - `0006` migration 생성 검증
- **QA_Validation**: [Premium Quotes DB Apply](../05_QA_Validation/14_PREMIUM_QUOTES_DB_APPLY_2026_05_28.md) - `0006` Turso DB 적용 검증
- **QA_Validation**: [Premium Quote Rows DB Apply](../05_QA_Validation/15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - P0 source 후보 quote row 적재 검증
