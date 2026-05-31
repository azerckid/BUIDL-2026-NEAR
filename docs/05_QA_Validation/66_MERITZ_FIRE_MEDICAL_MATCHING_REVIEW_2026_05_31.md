# [QA] 메리츠화재 실손의료보험 Baseline 매칭 검수
> Created: 2026-05-31 21:39
> Last Updated: 2026-05-31 21:39

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 메리츠화재 `src_meritz_direct_medical_202605`의 `coverage_category`, `matching_strategy`, `risk_targets`, caveat, source document citation 정책, snapshot 준비도 검수
- **결론**: 메리츠화재 실손의료보험은 공식 상품 페이지의 `6ADGE` PDF 목록 API에서 공식 문서 hash 3건과 보험다모아 조건별 숫자 quote 4건이 확인됐다. `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 추천 후보로 정리할 수 있다. 이번 작업은 DB write와 `seed.ts` 변경을 하지 않는다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 seed | `src/lib/db/seed.ts` |
| 입력 adapter probe | `data/insurance/latest_meritz_fire_disclosure_adapter_probe.json` |
| 입력 quote probe | `data/insurance/latest_premium_quote_probe.json` |
| 신규 검수 JSON | `data/insurance/latest_meritz_fire_medical_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_meritz_fire_medical_matching_review.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 1 |
| baseline ready source | 1 |
| source document seed 후보 | 3 |
| quote row 확인 | 4 |
| 숫자 KRW quote row | 4 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. 매칭 정책

실손의료보험은 특정 DNA risk key와 직접 연결하지 않는다. 메리츠화재 실손 source도 기존 DB손보, KB손보, 현대해상, 삼성화재, 농협손보 실손 baseline 상품과 동일하게 기본 의료비 방어 섹션에서만 표시한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |
| 추천 위치 | 위험 점수 랭킹이 아니라 기본 의료비 방어 섹션 |

---

## 4. Source 판정

| 항목 | 값 |
|---|---|
| Provider | 메리츠화재 |
| Source | `src_meritz_direct_medical_202605` |
| Product code | `N01G004000002G` |
| 보험다모아 상품명 | `(무) 메리츠 다이렉트 실손의료비보험2605` |
| 공식 상품 페이지 | `https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do` |
| PDF 목록 API | `https://store.meritzfire.com/json.smart` |
| PDF service id | `f.cg.he.ct.tm.o.bc.CtrCnfBc.retrievePdfFileLst` |
| PDF product code | `6ADGE` |
| 문서 근거 | 약관, 사업방법서, 상품요약서 3건, match 1.0 |
| Quote | 4/4 numeric |
| 판정 | source document seed 추가 후 baseline snapshot seed 후보 |

공식 문서 hash:

| document candidate | document_type | source_context | sha256 | bytes |
|---|---|---|---|---:|
| `doc_meritz_direct_medical_terms_202605` | `terms` | `6ADGE_20241002.pdf` | `bbbb86eb265233a01b71b0cc298748267531839a39bcf8aec79d442475274c0c` | 2,776,323 |
| `doc_meritz_direct_medical_business_method_202605` | `business_method` | `001_6ADGE_무배당+메리츠+다이렉트+실손의료비보험2408_사업방법서별지_v1.0.pdf` | `2331cd4a07e8fabd5977e6a715a174d822a9ac495f5b956335d600b75b43d280` | 95,371 |
| `doc_meritz_direct_medical_summary_202605` | `summary` | `6ADGE_20240806_y_(무)+메리츠+다이렉트+실손의료비보험2408+요약서_크로스완.pdf` | `6b02df741bb07a565d5315c3a5ce1655bcd56bdded61e9531c1bcaad60ce661e` | 127,920 |

---

## 5. Citation 정책

메리츠화재 PDF 다운로드 URL은 장기 citation으로 그대로 저장하지 않는다. `/hp/fileDownload.do`는 같은 세션 cookie와 `/json.smart` 응답의 암호화된 `atcFilePthNm#[E]` 값이 있어야 PDF가 내려온다.

후속 seed PR에서는 다음 원칙을 따른다.

| 항목 | 정책 |
|---|---|
| `source_url` | 공식 상품 페이지 `https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do` 사용 |
| hash 재검증 | `collect-carrier-disclosures.mjs`의 `meritz_direct_pdf_list` adapter로 재현 |
| 사용자 표시 | 공식 상품 페이지, 문서 유형, hash 확인일, session-bound 다운로드 caveat 표시 |
| 저장 금지 | cookie, session id, 일회성 encrypted download URL |

---

## 6. Caveat 정리

| Caveat | 추천 UI/상담 AI 반영 |
|---|---|
| baseline 상품 | 유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시 |
| 개인 견적 아님 | 보험다모아 quote는 공개 비교 조건의 예시 보험료이며 개인별 인수 심사 견적이 아님 |
| 실손 제한 | 자기부담금, 급여/비급여, 보장 한도, 갱신 조건이 적용됨 |
| variant 주의 | 사업방법서와 상품요약서 파일명에 `2408`이 포함되지만 2026-05-31 기준 공식 상품 페이지의 `6ADGE` 문서 목록에서 제공된 파일임 |
| citation 주의 | 메리츠화재 PDF 직접 URL은 session-bound라 공식 상품 페이지와 adapter 재검증 절차를 출처로 표시 |

---

## 7. Quote 상태

| 조건 | 보험료 | 예상 quote id |
|---|---:|---|
| 34세 남성 | 6,643 KRW | `quote_src_meritz_direct_medical_202605_age34_male_60456bed3452` |
| 34세 여성 | 7,103 KRW | `quote_src_meritz_direct_medical_202605_age34_female_b141dc7c5700` |
| 44세 남성 | 8,635 KRW | `quote_src_meritz_direct_medical_202605_age44_male_26615bdcb076` |
| 44세 여성 | 10,519 KRW | `quote_src_meritz_direct_medical_202605_age44_female_58dcc145a6b7` |

이번 PR은 quote row를 승인하지 않는다. 다음 seed PR에서 운영 DB 실제 quote id를 읽기 전용으로 확인한 뒤 4건을 `approved`로 승격한다.

---

## 8. Snapshot 준비 판단

| 항목 | 판단 |
|---|---|
| source approval | 가능. session-bound citation caveat 유지 필요 |
| source document seed | 약관, 사업방법서, 상품요약서 3건 추가 필요 |
| quote approval | 4건 numeric quote가 있어 가능 |
| product snapshot | baseline `insurance_products` 1건 추가 후보 |
| 운영 노출 | seed/apply 전까지 변경 없음 |

실손 baseline snapshot은 암보험처럼 DNA risk target 점수와 직접 경쟁하지 않는다. 다음 seed PR은 `matching_strategy=baseline`, `risk_targets=[]`, `coverage_category=medical_expense`를 반드시 유지해야 한다.

---

## 9. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 변경하지 않았다.
- 메리츠화재 source는 아직 `raw`이며 추천 UI에 노출되지 않는다.
- cookie와 session id는 저장하지 않는다.
- session-bound encrypted download URL은 seed의 장기 `source_url`로 사용하지 않는다.

---

## 10. 다음 작업

1. `SOURCE_AWARE_DOCUMENTS`에 메리츠화재 문서 3건을 추가한다.
2. 메리츠화재 source를 `approved`로 승격하고 quote 4건을 `approved`로 바꾸는 seed PR을 만든다.
3. baseline `insurance_products` snapshot 1건을 추가하되, 대표 보험료는 기존 실손 baseline 정책처럼 `age34_female` 조건을 사용한다.
4. 운영 DB 백업 후 seed apply PR로 source-backed active 추천 상품을 11건에서 12건으로 확대한다.
5. 이어서 흥국화재, 미래에셋생명, 한화손보 adapter를 순차 보강한다.

---

## 11. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 메리츠화재 실손 source를 baseline 추천 후보로 정규화했다 |
| Potential Impact | 실제 source-backed 실손 baseline 추천 후보를 1개 더 확대할 준비가 됐다 |
| Novelty | session-bound PDF 목록 API에서 얻은 공식 hash를 DNA 추천 baseline 정책과 연결했다 |
| UX | 사용자가 실손을 특정 유전자 질병 추천으로 오해하지 않도록 baseline caveat를 유지한다 |
| Open-source | 같은 검수 형식을 다른 손보사 실손 source에도 반복 적용할 수 있다 |
| Business Plan | 실제 판매 보험상품 커버리지를 넓히되 citation 리스크를 seed 전 단계에서 차단한다 |

---

## 12. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Meritz Fire Disclosure Adapter Probe](./65_MERITZ_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 공식 문서 hash 확보 근거
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 실손 baseline 공통 매칭 정책
- **QA_Validation**: [NH Fire Medical Matching Review](./62_NH_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 직전 실손 baseline 매칭 검수 패턴
- **Data**: [Meritz Fire Medical Matching Review JSON](../../data/insurance/latest_meritz_fire_medical_matching_review.json) - 구조화 검수 결과
- **Data**: [Meritz Fire Medical Matching Review CSV](../../data/insurance/latest_meritz_fire_medical_matching_review.csv) - 검수 요약
