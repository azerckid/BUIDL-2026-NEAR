# [QA] 데모 보험상품 운영 추천 제거 검증
> Created: 2026-05-30 15:46
> Last Updated: 2026-05-30 15:46

- **레이어**: 05_QA_Validation
- **상태**: Draft v1.0
- **범위**: legacy demo insurance products 5건을 운영 추천, 대시보드, 카트 경로에서 제외하는 변경 검증
- **결론**: 첫 source-backed 추천 snapshot이 운영 DB에 적용됐으므로, 사용자가 보는 보험 추천 경로는 `product_source_id`가 있는 실제 원천 기반 상품만 사용한다. 기존 demo 상품은 다음 seed 적용 시 `catalog_status=archived`, `is_active=0`으로 내려야 한다.

---

## 1. 배경

2026-05-30 첫 source-backed 추천 snapshot 적용 후 운영 DB에는 `insurance_products=8`이 존재한다.

| 구분 | 개수 | 상태 |
|---|---:|---|
| legacy demo 상품 | 5 | 기존 Phase 0 데모용. 공식 source row 없음 |
| source-backed 상품 | 3 | KDB생명 1건, 교보라이프플래닛 2건. source, document, quote 승인 완료 |

사용자 질문에 따라 데모 보험상품과 데모 추천 화면은 더 이상 운영 추천의 기본값으로 유지하지 않는다. 단, TEE 샘플 파일 업로드, mock TEE fixture, testnet checkout 시연은 별도 Phase 기능이므로 이번 PR 범위에서 제거하지 않는다.

---

## 2. 코드 변경 기준

| 파일 | 변경 기준 |
|---|---|
| `src/lib/db/insuranceProductFilters.ts` | 운영 추천 가능 상품 조건을 `is_active=1`, `catalog_status=approved`, `product_source_id IS NOT NULL`로 통일 |
| `src/actions/matchProducts.ts` | 신규 분석 결과의 추천 후보를 source-backed active 상품으로 제한 |
| `src/actions/getDashboardData.ts` | 과거 분석 결과에 demo product id가 남아 있어도 대시보드에서 제외 |
| `src/actions/createCart.ts` | source-backed active 상품이 아닌 id가 섞이면 카트 생성 거부 |
| `src/actions/getCartData.ts` | 과거 demo cart는 조회 시 무효 처리 |
| `src/lib/db/seed.ts` | fresh seed에서 demo 상품을 더 이상 insert하지 않고, 기존 5건은 archive update 대상으로 지정 |

---

## 3. Seed 적용 기준

이번 PR은 코드와 문서 변경만 포함하며 운영 DB write를 수행하지 않는다. 머지 후 apply PR에서 아래 순서로 진행한다.

1. 운영 Turso DB 백업을 생성한다.
2. `.env.local`이 운영 DB를 가리키는지 확인한다.
3. `npx tsx src/lib/db/seed.ts`를 실행한다.
4. `prod_001`부터 `prod_005`까지 `catalog_status=archived`, `is_active=0`인지 확인한다.
5. source-backed active 상품이 3건인지 확인한다.

예상 적용 결과는 아래와 같다.

| 항목 | 예상값 |
|---|---:|
| legacy demo active product | 0 |
| source-backed active product | 3 |
| active recommendation product | 3 |
| approved quote row | 12 |

---

## 4. 추천 경로 검증

| 경로 | 기대 결과 |
|---|---|
| 신규 DNA 분석 후 `matchProducts` | `prod_kdb_life_direct_cancer_202605`, `prod_kyobo_lifeplanet_cancer_nonsmoker_202605`, `prod_kyobo_lifeplanet_cancer_standard_202605` 중 매칭되는 상품만 반환 |
| 과거 분석 대시보드 | `prod_001`~`prod_005`가 추천 카드에 표시되지 않음 |
| 카트 생성 | demo product id 포함 시 오류 반환 |
| 카트 조회 | demo product id만 담긴 과거 cart는 `null` 처리 |

---

## 5. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 실제 source-backed 상품만 운영 추천에 남겨 추천 정확도를 높인다 |
| Potential Impact | 한국 보험상품 전체 카탈로그로 확장할 때 데모 데이터 오염을 제거한다 |
| Novelty | DNA risk target과 공식 보험상품 snapshot을 직접 연결하는 구조를 강화한다 |
| UX | 사용자가 데모 특약을 실제 판매 상품으로 오해할 위험을 줄인다 |
| Open-source | 추천 가능 상품의 DB 조건을 코드로 명확히 하여 재사용 가능성을 높인다 |
| Business Plan | 실제 보험 비교/중개 서비스로 넘어가기 전 데이터 신뢰 기준을 강화한다 |

---

## 6. Related Documents

- **Technical_Specs**: [보험상품 매칭 키워드 정리 정책](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준과 source-backed 상품 조건
- **Technical_Specs**: [한국 보험상품 데이터 수집 파이프라인](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - source catalog 수집부터 recommendation snapshot 발행까지의 데이터 흐름
- **Logic_Progress**: [로드맵](../04_Logic_Progress/ROADMAP.md) - 두 기둥 실행 트랙과 Track A 진행 상황
- **Logic_Progress**: [조건별 보험료 Quote Matrix 관리 방침](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote 분리 정책
- **QA_Validation**: [First Recommendation Snapshot DB Apply](./32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md) - 운영 DB에 첫 source-backed 상품 3건을 적용한 검증 기록
