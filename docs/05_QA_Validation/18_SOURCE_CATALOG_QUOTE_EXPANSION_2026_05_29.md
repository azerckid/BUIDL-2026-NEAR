# [QA] Source Catalog Quote-only 후보 확장 검증
> Created: 2026-05-29 00:45
> Last Updated: 2026-05-29 01:25

- **레이어**: 05_QA_Validation
- **상태**: Completed - DB Applied by QA19
- **범위**: 보험다모아 quote matrix의 `not_in_source_catalog` 60건을 연결하기 위한 raw source 후보 확장
- **결론**: 최신 quote matrix의 미등록 60건은 15개 고유 상품에서 발생했다. 이번 PR은 이 15개 상품과 신규 carrier 10개를 `seed.ts`에 quote-only raw 후보로 추가했다. 운영 DB 적용과 quote row 60건 추가 적재는 QA19에서 백업 후 완료했다.

---

## 1. 배경

PR #14 이후 `data/insurance/latest_premium_quote_probe.json`은 84개 raw quote row를 만든다. 이 중 운영 DB의 기존 source-aware 후보와 매칭된 것은 24건이고, 60건은 `not_in_source_catalog`로 제외됐다.

제외 사유는 quote row 오류가 아니라 `insurance_product_sources.e_insmarket_product_code`에 해당 상품 코드가 아직 없기 때문이다. 따라서 quote row를 더 넣으려면 먼저 원천 상품 후보를 확장해야 한다.

---

## 2. 추가 후보 요약

| 구분 | 수 |
|---|---:|
| 추가 carrier seed | 10 |
| 추가 product source seed | 15 |
| 추가 source document | 0 |
| 추가 추천 snapshot | 0 |
| 연결 가능한 quote row | 60 |

신규 `insurance_product_sources` row는 모두 `review_status=raw`다. 이는 보험다모아 quote matrix에서 상품명, 보험사, product code, 조건별 보험료를 확인했지만 공식 약관/상품요약서 hash와 매칭 키워드 정리는 아직 완료하지 않았다는 뜻이다.

---

## 3. 후보 목록

| 상품군 | 보험사 | 상품명 | Product code | 연결 quote row |
|---|---|---|---|---:|
| 실손의료보험 | 농협손보 | (무) 헤아림실손의료비보험2605 | `N71G004000001G` | 4 |
| 실손의료보험 | 롯데손보 | 무배당 let:care 실손의료보험Ⅴ(2605) | `N03G004000001G` | 4 |
| 실손의료보험 | 메리츠화재 | (무) 메리츠 다이렉트 실손의료비보험2605 | `N01G004000002G` | 4 |
| 실손의료보험 | 한화손보 | 한화다이렉트실손의료보험(갱신형)Ⅴ 무배당 | `N02G004000001G` | 4 |
| 실손의료보험 | 흥국화재 | (무)흥Good 다이렉트 실손의료보험(26.05) | `N05G004000001G` | 4 |
| 암보험 | 교보라이프플래닛 | (무)교보라플 비갱신암보험(해약환급금 미지급형, 비흡연체) | `L43C009000022` | 4 |
| 암보험 | 교보라이프플래닛 | (무)교보라플 비갱신암보험(해약환급금 미지급형, 표준체) | `L43C009000019` | 4 |
| 암보험 | 동양생명 | (무)우리WON하는실속하나로암보험 | `L74C009000006` | 4 |
| 암보험 | 미래에셋생명 | 온라인 암보험 무배당 [기본형] | `L34C009000021` | 4 |
| 암보험 | 미래에셋생명 | 온라인 암보험 무배당 [해약환급금이없는유형] | `L34C009000022` | 4 |
| 암보험 | 신한라이프생명 | 신한SOL암보험(무배당)(비갱신형) | `L11C009000007` | 4 |
| 암보험 | 한화생명 | 한화생명 e암보험(비갱신형)(무)(비흡연체형) | `L01C009000010` | 4 |
| 암보험 | 한화손보 | 한화 다이렉트 내가고른 암보험 무배당2604 | `N02C009000016` | 4 |
| 암보험 | DB생명 | (무)e로운 암보험(해약환급금 미지급형)(2601) | `L71C009000006` | 4 |
| 암보험 | KDB생명 | KDB다이렉트 암보험(해약환급금 미지급형III)(무) | `L33C009000025` | 4 |

---

## 4. Seed 정책

| 항목 | 결정 |
|---|---|
| `review_status` | `raw` |
| `official_product_url` | `null`. 보험사 공식 상품 URL은 후속 crawler/hash 작업에서 보강 |
| 대표 보험료 | `monthly_premium_krw=null`, `premium_text=null` |
| 조건별 보험료 | `insurance_premium_quotes`에만 저장 |
| source document | 이번 PR에서는 추가하지 않음 |
| 사용자 추천 노출 | 없음 |

source row 대표 보험료를 비워 둔 이유는 15개 후보의 가격이 이미 나이/성별 조건별 quote matrix로 존재하기 때문이다. 대표 가격을 임의로 고르면 사용자에게 확정 견적처럼 보일 수 있으므로, 조건별 가격은 `insurance_premium_quotes`로만 다룬다.

---

## 5. 안전성 판단

- 신규 source 후보는 `insurance_products`에 들어가지 않으므로 추천 엔진이 읽지 않는다.
- 신규 row는 모두 `review_status=raw`라 매칭 키워드 정리 완료 상태로 오해하지 않는다.
- source document hash는 새로 만들지 않았다. 공식 문서 hash가 확보되기 전에는 `insurance_source_documents`를 늘리지 않는다.
- DB write는 이번 PR에서 실행하지 않았다. 운영 DB 적용은 QA19에서 백업과 row count 검증 후 수행했다.
- 기존 active demo 상품 5개와 기존 quote row 24건은 변경하지 않는다.

---

## 6. DB 적용 결과

이번 PR이 머지된 뒤 별도 DB apply를 수행했고, 결과는 다음과 같다.

| 단계 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` 기존 row | 24 |
| 신규 quote insert row | 60 |
| 적용 후 quote row | 84 |

적용 전에는 `.env.local` 대상 DB 확인, 읽기 전용 dump 백업, 백업 SHA-256 기록, seed 실행, quote apply dry-run, quote apply `--apply`, 중복/invalid hash 검증 순서로 진행했다. 세부 결과는 `19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md`에 둔다.

---

## 7. 검증 명령

| 명령 | 목적 | 결과 |
|---|---|---|
| `npx eslint src/lib/db/seed.ts --quiet` | seed 코드 lint | 통과 |
| `npx eslint src --quiet` | 앱 소스 lint | 통과 |
| `npx tsc --noEmit` | TypeScript 정합성 | 통과 |
| `git diff --check` | whitespace/drift 검증 | 통과 |
| `grep -L "Created:" ...` | 문서 메타데이터 검증 | 출력 없음 |
| `grep -L "Last Updated:" ...` | 문서 메타데이터 검증 | 출력 없음 |

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | quote matrix의 60개 미매칭 row를 실제 source 후보에 연결할 준비를 했다 |
| Potential Impact | 암보험과 실손의료보험의 실제 상품 universe를 7개에서 22개 source 후보로 확장한다 |
| Novelty | 공식 quote matrix와 source catalog를 분리해 조건별 가격 데이터를 단계적으로 축적한다 |
| UX | 대표 보험료와 조건별 보험료를 혼동하지 않도록 raw 후보의 대표 보험료를 비워 둔다 |
| Open-source | quote-only 후보를 추천 snapshot과 분리하는 재사용 가능한 수집 패턴을 남긴다 |
| Business Plan | 더 많은 실제 상품을 다뤄 보험 비교/중개형 서비스의 데이터 기반을 넓힌다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/quote 수집 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog와 quote table 설계
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved의 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 다음 작업
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote matrix 분리 정책
- **QA_Validation**: [Premium Quote Rows DB Apply](./15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - 기존 24건 quote row 적재 맥락
- **QA_Validation**: [Medical Female Quote Params](./17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md) - 84개 raw quote row 생성 근거
- **QA_Validation**: [Source Catalog Quote DB Apply](./19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only raw source 후보와 60건 추가 quote 적용 검증
