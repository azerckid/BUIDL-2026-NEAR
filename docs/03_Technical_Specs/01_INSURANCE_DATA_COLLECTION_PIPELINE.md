# [기술 명세] 한국 보험상품 데이터 수집 파이프라인
> Created: 2026-05-27 03:14
> Last Updated: 2026-05-29 23:11

- **레이어**: 03_Technical_Specs
- **상태**: Draft v2.6
- **범위**: 한국 보험사 상품 공시자료, 보험다모아/협회 공시, 공공 OpenAPI, PDF 수집 및 정규화
- **결론**: 보험상품 원문을 모델에 고정 학습시키지 않고, 공식 출처 기반 카탈로그 DB와 RAG/검색 계층으로 운영한다.

---

## 1. 목적

OHmyDNA Insurance Agent가 유저에게 실제 보험상품을 추천하려면 한국에서 판매 중인 보험상품을 주기적으로 수집하고, DNA 질병 위험과 매칭 가능한 구조로 정규화해야 한다.

한국 보험상품 데이터는 공개 REST API보다 공시 웹페이지와 PDF 문서에 많이 존재한다. 따라서 이 명세는 API 연동만이 아니라 PDF 다운로드, 원문 해시, 텍스트 추출, 정규화, 매칭 키워드 정리 단계를 포함한다.

---

## 2. 핵심 원칙

1. **공식 출처 우선**: 생명보험협회, 손해보험협회, 보험다모아, 보험사 공식 공시실, 공공데이터포털을 우선한다.
2. **학습보다 검색/정규화**: 원문 PDF를 LLM에 영구 학습시키지 않는다. 구조화 DB와 RAG 검색에 연결한다.
3. **원문 재배포 금지**: 약관/PDF 원문은 내부 검증용 또는 링크/해시 보존용으로만 다룬다. 서비스 화면에는 원문 출처 링크와 확인일을 표시한다.
4. **보험료와 추천 분리**: 공시 보험료는 표준 조건 기준일 수 있으므로 실제 견적/청약 보험료로 단정하지 않는다.
5. **대표 보험료와 조건별 quote 분리**: `premium_text`는 대표 가격 snapshot이고, 나이/성별/납입기간별 가격 matrix는 별도 quote table로 수집한다.
6. **매칭 키워드 정리 필수**: `coverage_category`, `risk_targets`, `matching_strategy`, caveat는 자동 추출 결과를 그대로 쓰지 않고 DNA risk target 매칭 기준으로 정리한다.
7. **주기적 갱신**: 보험상품은 변경·판매중지·개정될 수 있으므로 월간 갱신과 분기별 전체 감사를 수행한다.

---

## 3. 수집 대상 범위

### 3-1. 보험사 기준

| 구분 | 기준 출처 | 수집 목적 |
|---|---|---|
| 생명보험사 | 생명보험협회 회원사 안내 | 삼성생명, 한화생명, 교보생명, 신한라이프, KB라이프, NH농협생명 등 전체 생보사 목록 확보 |
| 손해보험사 | 손해보험협회 공시실/회원사 공시 | 삼성화재, 현대해상, KB손보, DB손보, 메리츠화재, 한화손보 등 전체 손보사 목록 확보 |
| 준회원/온라인 전업/우체국 | 협회 회원사, 공공데이터포털, 우체국금융 OpenAPI | 온라인 전업사와 공공 보험상품 후보 포함 여부 판단 |

### 3-2. 상품 범위

MVP와 유전자 위험 매칭의 직접성을 고려해 우선순위를 둔다.

| 우선순위 | 상품군 | 이유 |
|---|---|---|
| P0 | 암보험, 질병보험, 실손의료비, 간병/치매보험 | 유전자 위험 플래그와 직접 매칭 가능 |
| P1 | 건강보험, 상해보험, 어린이보험, 정기보험 | 위험 보장 구조가 명확하고 보험다모아/협회 공시 가능성 높음 |
| P2 | 연금보험, 저축보험, 종신보험, 변액보험 | 서비스 확장 후보. 유전자 위험 추천과 직접성은 낮음 |
| 제외 후보 | 자동차, 화재, 배상책임, 기업성 보험 | 초기 유전자 기반 추천과 직접 관련 낮음 |

---

## 4. 출처 우선순위

| Tier | 출처 | 수집 방식 | 용도 |
|---|---|---|---|
| 0 | 생명보험협회/손해보험협회 회원사 목록 | HTML 조회 | 전체 보험사 universe 확정 |
| 1 | 생명보험협회/손해보험협회 상품비교공시 | HTML/PDF/다운로드 링크 | 보험사별 상품 목록과 비교 기준 확보 |
| 1 | 보험다모아 | HTML 조회 | 소비자 관점 비교, 온라인 가입 가능 상품 후보 |
| 2 | 개별 보험사 공시실 | PDF/HTML 다운로드 | 약관, 상품요약서, 사업방법서, 보험가격공시 원문 검증 |
| 3 | 공공데이터포털/우체국금융 OpenAPI | API 호출 | API 파이프라인 PoC와 구조화 데이터 샘플 |
| 3 | HIRA 보건의료빅데이터 OpenAPI | API 호출 | 질병 통계와 `risk_targets` 근거 보강 |
| 4 | CODEF/제휴/B2B API | 계약 기반 API | 운영 단계 자동화 후보 |

---

## 5. 수집 파이프라인

```text
1. 보험사 목록 동기화
2. 보험사별 공시실/협회/보험다모아 상품 인덱스 수집
3. 상품별 원문 URL/PDF 다운로드 후보 추출
4. PDF 또는 HTML 원문 다운로드
5. source_url, retrieved_at, file_hash, source_type 저장
6. 텍스트 추출 및 표 파싱
7. 상품 메타데이터 정규화
8. coverage_category/risk_targets 자동 후보 생성
9. 질병-보장 매핑과 매칭 키워드 정리
10. 대표 보험료와 premium_basis 기준 정리
11. 서비스용 insurance_products snapshot 발행
12. 조건별 보험료 quote matrix는 `insurance_premium_quotes`에 source-aware 후보 단위로 적재
13. 변경 감지와 주기적 재검증
```

---

## 6. 정규화 데이터 모델 후보

현재 코드 변경은 하지 않는다. 실제 구현 전 아래 테이블 후보를 DB 스키마 문서에 반영한다.

### 6-1. `insurance_carriers`

| 필드 | 설명 |
|---|---|
| `id` | 내부 보험사 ID |
| `name_ko` | 보험사 한글명 |
| `carrier_type` | `life`, `general`, `postal`, `reinsurance`, `other` |
| `association_source` | `klia`, `knia`, `manual` |
| `homepage_url` | 보험사 공식 홈페이지 |
| `disclosure_url` | 보험사 공시실 URL |
| `is_active` | 영업/수집 대상 여부 |
| `last_checked_at` | 보험사 정보 마지막 확인일 |

### 6-2. `insurance_source_documents`

| 필드 | 설명 |
|---|---|
| `id` | 원문 문서 ID |
| `carrier_id` | 보험사 ID |
| `product_source_id` | 상품 원천 ID |
| `source_type` | `association`, `e_insmarket`, `carrier_disclosure`, `data_go_kr`, `postal_api`, `manual` |
| `source_url` | 원문 URL |
| `document_type` | `terms`, `summary`, `business_method`, `price_disclosure`, `product_page`, `api_response` |
| `file_hash` | 다운로드 파일 또는 응답 본문 해시 |
| `retrieved_at` | 수집 시각 |
| `effective_date` | 상품/약관 적용일 |
| `usage_status` | `internal_only`, `link_only`, `public_metadata_allowed` |

### 6-3. `insurance_product_sources`

| 필드 | 설명 |
|---|---|
| `id` | 원천 상품 ID |
| `carrier_id` | 보험사 ID |
| `raw_product_name` | 원문 상품명 |
| `normalized_product_name` | 정규화 상품명 |
| `product_group` | 암, 질병, 실손, 치매, 건강, 상해 등 |
| `sale_status` | `active`, `suspended`, `archived`, `unknown` |
| `premium_basis` | 보험료 산정 기준 |
| `monthly_premium_krw` | 표준 조건 월 보험료 |
| `coverage_summary` | 주요 보장 요약 |
| `exclusions_summary` | 주요 면책/제한 요약 |
| `review_status` | `raw`, `parsed`, `needs_review`, `approved`, `rejected` |
| `last_verified_at` | 사람이 마지막 검수한 시각 |

### 6-4. `insurance_premium_quotes`

조건별 보험료 matrix를 저장하는 별도 테이블이다. 2026-05-28 기준 `drizzle/0006_real_war_machine.sql`이 운영 Turso DB에 적용됐고, 2026-05-29 기준 보험다모아 quote PoC 84개 raw row 전부를 source 후보와 매칭해 `needs_review` 상태로 적재했다. 60건은 quote-only raw source 후보 15개를 백업 후 DB에 적용한 뒤 추가 적재했다.

| 필드 | 설명 |
|---|---|
| `id` | quote row ID |
| `product_source_id` | 원천 상품 ID |
| `carrier_id` | 보험사 ID |
| `age` | 조회 기준 나이 |
| `sex` | 정규화 성별 |
| `source_sex_code` | 원문 성별 파라미터 |
| `payment_period_years` | 납입기간 |
| `insurance_period_years` | 보험기간 |
| `coverage_amount_krw` | 기준 가입금액 또는 보장금액 |
| `plan_name` | 표준체/비흡연체/기본형 등 플랜명 |
| `riders_json` | 특약 조합 |
| `monthly_premium_krw` | 조건별 월 보험료 |
| `premium_text` | 원문 보험료 문구 |
| `quote_source_url` | 가격 조회 원문 URL |
| `quote_params_json` | 조회 파라미터 원문 |
| `quote_hash_sha256` | 응답 또는 가격 원문 hash |
| `retrieved_at` | 수집 시각 |
| `review_status` | `raw`, `needs_review`, `approved`, `rejected` |

---

## 7. 서비스 매핑 규칙

| 원천 데이터 | 서비스 필드 |
|---|---|
| 보험사명 | `insurance_products.provider` |
| 정규화 상품명 | `insurance_products.name` |
| 상품군 | `insurance_products.coverage_category` |
| 보장 질병/담보 키워드 | `insurance_products.risk_targets` |
| 원 보험료 KRW | 향후 `monthly_premium_krw` |
| 조건별 보험료 matrix | `insurance_premium_quotes` |
| USDC 환산값 | `insurance_products.monthly_premium_usdc` |
| 출처 URL/확인일 | 향후 source table 또는 UI citation |
| 판매상태 | `is_active` |

`coverage_category`와 `risk_targets`는 자동 추출 결과를 그대로 사용하지 않는다. 추천 결과에 영향을 주는 필드이므로 질병-보장 매핑과 매칭 키워드 정리가 끝난 뒤 서비스 DB에 반영한다.

---

## 8. PDF 처리 정책

| 항목 | 정책 |
|---|---|
| 다운로드 | 공식 공시실 또는 협회/보험다모아에서 공개된 문서만 대상으로 한다 |
| 저장 | 원문 재배포 권한이 불명확하면 내부 저장 또는 URL+해시 저장만 허용한다 |
| 파싱 | 텍스트, 표, 보장명, 가입조건, 면책사항을 추출한다 |
| 표시 | 사용자 화면에는 원문 전문 대신 요약, 출처, 확인일, 원문 링크를 표시한다 |
| 변경 감지 | 동일 URL이라도 `file_hash`가 바뀌면 재파싱하고 매칭 키워드를 다시 확인한다 |
| LLM 사용 | 원문 전체를 모델에 학습시키지 않고, 정리된 추출 결과 또는 RAG 컨텍스트로만 사용한다 |

---

## 9. 정기 업데이트 운영

| 주기 | 작업 | 산출물 |
|---|---|---|
| 주간 | 핵심 출처 접근 가능성 확인, API 상태 확인, 다운로드 실패 목록 점검 | `source_health` 로그 |
| 월간 | P0/P1 상품군 신규·개정·판매중지 상품 확인, PDF hash 변경 감지 | 월간 카탈로그 변경 리포트 |
| 분기 | 전체 보험사 목록 재확인, 협회/보험다모아/보험사 공시실 링크 재검증 | 분기 전체 감사 리포트 |
| 이벤트 발생 시 | 금융당국 제도 변경, 보험사 공지, 상품 대규모 개정, API 스키마 변경 대응 | 긴급 업데이트 기록 |

초기 구현에서는 자동 크론보다 수동 실행 가능한 스크립트와 체크리스트를 먼저 만든다. 안정화 후 Vercel Cron 또는 별도 worker로 전환한다.

### 9-1. Collector v1 수동 실행

반복 가능한 첫 수집기는 다음 명령으로 실행한다.

```bash
npm run collect:insurance
```

기본 출력 파일은 `data/insurance/latest_official_sources_snapshot.json`이다. 이 파일은 서비스 DB에 바로 넣는 상품 카탈로그가 아니라, 공식 출처 접근성·보험사 목록·보험다모아 샘플·공식 상품 이동 URL·API 후보를 기록하는 snapshot이다.

현재 Collector v1 범위는 다음과 같다.

| 수집 대상 | 결과 |
|---|---|
| 생명보험협회 회원사 | 생명보험사 22개, 비주요 회원 별도 분류 |
| 손해보험협회 회원사 | 손해보험사/화재보험사 17개, 재보험/보증/특수보험 별도 분류 |
| 손해보험협회 실손의료보험 공시 | 공시 페이지 접근성과 일부 보험사명 감지 |
| 보험다모아 P0 상품군 | 암보험 12개, 실손의료보험 9개, 유병력자실손 3개, 질병보험 31개, 간병/치매보험 1개 추출 |
| 우체국금융 OpenAPI 안내 | 보험상품정보/이율/보험료 API 후보 3개 감지 |
| 삼성생명 공개 PDF | PDF HEAD 응답, content-type, length, last-modified 확인 |

운영 DB 추천 반영은 여전히 금지한다. `coverage_category`, `risk_targets`, `matching_strategy`는 매칭 키워드 정리가 끝난 값만 서비스 추천에 사용할 수 있다. `sale_status`와 `premium_basis`는 추천 화면에서 오해를 만들지 않도록 함께 확인한다. `premium_text`는 개인 맞춤 견적이 아니라 수집 당시 비교 조건의 대표 보험료로만 취급한다.

### 9-2. Product Document Probe v1 수동 실행

대표 상품의 공식 상품 페이지와 PDF 후보는 다음 명령으로 확인한다.

```bash
npm run collect:insurance:docs
```

기본 출력 파일은 `data/insurance/latest_product_document_probe.json`이다. 2026-05-27 12:49 KST 기준 결과는 다음과 같다.

| 항목 | 결과 |
|---|---|
| 대표 상품 probe | 8개 |
| 공식 상품 페이지 접근 | 8개 성공 |
| PDF 후보 URL | 5개 |
| 실제 PDF hash | 2개 |
| hash 확보 상품 | 한화생명 e암보험(비갱신형)(무)(표준체형) 상품요약서/약관 |

다수 보험사의 direct landing page는 초기 HTML에 PDF 링크를 노출하지 않는다. 이 경우 상품 페이지가 아니라 보험사 공시실 crawler로 상품요약서/약관 URL을 찾아야 한다.

### 9-3. Carrier Disclosure Crawler v1 수동 실행

공식 상품 페이지에서 PDF를 찾지 못한 대표 상품은 보험사 공시실/상품공시 페이지를 추가로 탐색한다.

```bash
npm run collect:insurance:disclosures
```

기본 출력 파일은 `data/insurance/latest_carrier_disclosure_probe.json`이다. 2026-05-28 02:28 KST 기준 최신 결과는 다음과 같다.

| 항목 | 결과 |
|---|---|
| 대상 상품 | 7개 |
| 공시실 profile 적용 보험사 | 7개 |
| 공시실 페이지 접근 | 7개 성공 |
| PDF hash | 10개 |
| hash 확보 상품 | 삼성생명 통합약관, 삼성화재 약관, DB손보 약관/사업방법서/상품요약서, 현대해상 약관, KB손보 약관, 신한라이프 상품요약서/사업방법서/판매약관 |

Crawler v1은 상품명 매칭 임계값을 보수적으로 적용한다. 예를 들어 DB생명 `(무)e로운 암보험(해약환급금 미지급형)(2601)`과 DB생명 공시실의 `(무)AI 라이프케어 암보험(2605)`처럼 일부 단어만 겹치는 경우는 false positive로 보고 제외한다.

2026-05-28 02:28 KST 기준 DB손보, 삼성생명, 현대해상, 신한라이프, KB손보 전용 JavaScript/API adapter를 추가했다. 남은 대표 병목은 DB생명 상품명 매칭과 조건별 보험료 재조회 가능성 확인이다.

### 9-4. Matching Queue CSV v1 수동 생성

서비스 DB 추천 snapshot으로 발행하기 전에 매칭 키워드를 정리할 CSV를 생성한다.

```bash
npm run collect:insurance:review
```

출력 파일은 다음과 같다.

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_insurance_review_queue.csv` | 상품 row별 매칭 키워드 정리 작업표 |
| `data/insurance/latest_insurance_review_queue_summary.json` | row 수, hash 확보 수, QA blocker 요약 |

2026-05-28 02:28 KST 기준 결과는 다음과 같다.

| 항목 | 결과 |
|---|---|
| 전체 매칭 정리 row | 56개 |
| 공식 상품 URL 보유 row | 47개 |
| 공식 문서 hash 보유 row | 7개 |
| hash 문서 수 | 12개 |
| 우선 매칭 정리 대상 | 한화생명 e암보험, 신한SOL암보험, DB손보/KB손보/삼성화재/현대해상 실손의료보험, 삼성생명 인터넷 입원 건강보험 |

CSV의 `needs_human_review`는 추천 DB 반영 승인이 아니라 매칭 키워드 정리 우선순위다. `coverage_category`, `risk_targets`, `matching_strategy`, caveat가 정리되기 전까지 서비스 추천에 사용하지 않는다.

### 9-5. Hash-backed 상품 매칭 키워드 정리 v1.2

2026-05-28 02:36 KST 기준 공식 문서 hash가 확보된 7개 상품을 매칭 키워드 정리 샘플로 분류했다.

| 항목 | 결과 |
|---|---|
| 매칭 정리 대상 | 한화생명 e암보험, 신한SOL암보험, DB손보/KB손보/삼성화재/현대해상 실손의료보험, 삼성생명 인터넷 입원 건강보험 |
| 출처 기반 카탈로그 후보 | 2개: 한화생명 e암보험, 신한SOL암보험 |
| baseline 후보 | 4개: DB손보/KB손보/삼성화재/현대해상 실손의료보험 |
| 스키마/정책 결정 필요 | 1개: 삼성생명 인터넷 입원 건강보험 |
| 현재 `insurance_products` seed 바로 반영 | 0개 |
| 산출물 | `data/insurance/latest_seed_candidate_review.json`, `data/insurance/latest_seed_candidate_review.csv` |

매칭 키워드 정리 과정에서 확인한 핵심 gap은 대표 보험료와 조건별 보험료 matrix를 분리해야 한다는 점이다. 현재 `premium_text`는 공식 비교 조건 기준 예시 보험료이며, 나이/성별/납입기간별 변동 가격은 `insurance_premium_quotes`로 별도 관리한다.

또한 실손의료보험은 특정 유전자 위험 플래그가 아니라 질병/상해 의료비를 폭넓게 보상하는 상품이다. 이를 추천하려면 `coverage_category`에 `medical_expense`를 추가하거나, 유전자 특화 보장과 일반 의료비 보장을 분리한 매칭 트랙이 필요하다.

### 9-6. Schema Extension Decision v1

2026-05-27 22:43 KST 기준 스키마 확장 방향을 확정했다. 원천 상품과 추천 snapshot을 분리한다.

| 구분 | 결정 |
|---|---|
| 원천 상품 | `insurance_product_sources`에 저장 |
| 원문 문서 hash | `insurance_source_documents`에 저장 |
| 보험사 기준 정보 | `insurance_carriers`에 저장 |
| 매칭 키워드 정리 완료 상품 | 확장된 `insurance_products`에 추천 snapshot으로 발행 |
| 실손의료보험 | `coverage_category=medical_expense`, `matching_strategy=baseline` |
| 유전자 위험 상품 | 기존 결정론적 `risk_targets` 교집합 매칭 유지 |

상세 필드와 구현 순서는 `02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md`를 기준으로 한다.

### 9-7. Quote-only Source Catalog Expansion

2026-05-29 기준 최신 quote matrix의 `not_in_source_catalog` 60건은 15개 고유 상품에서 발생했다. 해당 15개 상품은 `insurance_product_sources.review_status=raw` 후보로 seed에 추가했고, 백업 후 DB 적용과 quote row 60건 추가 적재까지 완료했다.

| 항목 | 결과 |
|---|---:|
| 신규 carrier seed | 10 |
| 신규 product source seed | 15 |
| 신규 source document | 0 |
| 추천 snapshot 발행 | 0 |
| 추가 적재 quote row | 60 |
| 최종 quote row | 84 |

이 후보들은 보험다모아 quote matrix에서 상품명, 보험사, product code, 조건별 보험료만 확인한 상태다. 공식 약관/상품요약서 hash와 매칭 키워드 정리가 끝나기 전까지 사용자 추천에 사용하지 않는다.

### 9-8. Quote-only Source Document Probe v1

quote-only 후보는 대표 상품 1개씩 고르는 방식이 아니라 product code 단위로 재조회해야 한다. 이를 위해 `collect-product-documents.mjs`에 `--product-codes` 옵션을 추가했다.

```bash
npm run collect:insurance:docs -- --product-codes <comma-separated-product-codes> --out data/insurance/latest_quote_only_product_document_probe.json
```

2026-05-29 01:55 KST 기준 결과는 다음과 같다.

| 항목 | 결과 |
|---|---:|
| 대상 product code | 15 |
| 공식 상품 URL 보유 | 12 |
| 공식 상품 URL 없음 | 3 |
| 상품 페이지 hashed PDF | 5 |
| carrier disclosure 추가 hashed PDF | 3 |

상품 페이지에서 바로 hash를 확보한 것은 한화생명 비흡연체형과 KDB생명 다이렉트 암보험이다. 신한라이프 후보는 공시 crawler에서 3개 hash가 추가로 나왔지만 match score 0.5라 상품 variant 확인이 필요하다. 상세 산출물은 `data/insurance/latest_quote_only_product_document_probe.json`, `data/insurance/latest_quote_only_carrier_disclosure_probe.json`, QA 문서는 `../05_QA_Validation/20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md`에 둔다.

### 9-9. Lifeplanet Disclosure Adapter v1

2026-05-29 02:26 KST 기준 교보라이프플래닛 공시실 `HPDA01S0` 화면의 embedded `ProdMainList` JSON과 `/common/file/FileDownload.dev` 다운로드 규칙을 adapter로 연결했다.

| 항목 | 결과 |
|---|---:|
| 신규 carrier profile | 1 |
| 신규 API search kind | 1 |
| 교보 match product | 2 |
| 교보 match score | 1.0 |
| 교보 hashed document | 6 |
| carrier disclosure hashed document | 9 |

교보 quote-only 후보 2개(`L43C009000022`, `L43C009000019`)는 같은 공시 상품 코드 `10054`를 공유하며, 상품요약서, 사업방법서, 보험약관 hash를 확보했다. 이번 결과는 `data/insurance/latest_quote_only_carrier_disclosure_probe.json`과 `../05_QA_Validation/21_LIFEPLANET_DISCLOSURE_ADAPTER_2026_05_29.md`에 둔다.

이 단계에서도 DB write는 하지 않는다. hash-backed 후보는 상품 variant, `coverage_category`, `risk_targets`, `matching_strategy`, caveat 검토 후 별도 seed PR에서만 승격한다.

### 9-10. Quote-only Source Document Variant Review

2026-05-29 02:58 KST 기준 quote-only hash-backed 후보를 seed 적용 전 variant gate로 분류했다.

| 항목 | 결과 |
|---|---:|
| 검수 source 후보 | 5 |
| 검수 document row | 14 |
| seed 후보 source | 3 |
| seed 후보 document row | 8 |
| 차단 source | 2 |
| DB write | 0 |

Seed 후보는 한화생명 비흡연체형 source 1개와 교보라이프플래닛 비흡연체/표준체 source 2개다. KDB생명은 `40869_policy`와 `40870_policy` 중 어느 약관이 product code `L33C009000025`에 해당하는지 확인 전까지 차단한다. 신한라이프 quote-only 표준형 source는 해약환급금 미지급형 문서가 match score 0.5로 잡혀 차단한다.

검수 결과는 `data/insurance/latest_quote_only_source_document_variant_review.json`, `data/insurance/latest_quote_only_source_document_variant_review.csv`, `../05_QA_Validation/22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md`에 둔다. 다음 seed PR은 안전 후보 8개 document row만 추가하고, `insurance_product_sources.review_status`와 추천 노출 상태는 승격하지 않는다.

### 9-11. Source Document Seed Candidates

2026-05-29 03:24 KST 기준 variant gate를 통과한 8개 문서 row를 `src/lib/db/seed.ts`의 `SOURCE_AWARE_DOCUMENTS`에 추가했다.

| 항목 | 결과 |
|---|---:|
| 기존 source document seed | 12 |
| 신규 source document seed | 8 |
| 최종 source document seed | 20 |
| 신규 product source 승격 | 0 |
| 추천 snapshot 발행 | 0 |
| DB write | 0 |

Shared hash 정책은 다음과 같다. 같은 공식 PDF가 여러 product source의 근거가 될 수 있으므로 `file_hash_sha256` 중복은 허용한다. 대신 각 연결 row는 고유 `id`와 고유 `product_source_id`를 가진다. `insurance_source_documents.file_hash_sha256`은 unique가 아니라 index이며, seed는 row id 기준 `onConflictDoNothing()`으로 idempotent하게 동작한다.

이번 추가분은 한화생명 비흡연체형 2개 문서와 교보라이프플래닛 비흡연체/표준체 6개 문서다. KDB생명과 신한라이프 차단 후보는 포함하지 않는다. 검증 문서는 `../05_QA_Validation/23_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_29.md`에 둔다. 운영 DB 적용은 백업 후 별도 apply PR에서 진행한다.

### 9-12. Source Document DB Apply

2026-05-29 14:23 KST 기준 9-11의 안전 후보 8개 문서 row를 운영 Turso DB에 백업 후 적용했다.

| 항목 | 결과 |
|---|---:|
| 백업 테이블 수 | 12 |
| 적용 전 source document | 12 |
| 신규 source document | 8 |
| 적용 후 source document | 20 |
| 누락 신규 document id | 0 |
| invalid source document hash | 0 |
| product source review status 변경 | 0 |
| 추천 snapshot 발행 | 0 |

적용 후 `insurance_product_sources.review_status` 분포는 `needs_review=7`, `raw=15` 그대로다. 이번 단계는 공식 문서 근거 연결만 수행하며, 추천 가능 상품 승격이나 quote row 승인에는 관여하지 않는다.

Shared hash group은 5개가 존재한다. 한화생명 표준체형/비흡연체형과 교보라이프플래닛 비흡연체/표준체가 같은 공식 PDF를 공유하기 때문이다. 이 중복은 의도된 연결 관계이며, `file_hash_sha256` unique 제약이 없고 row id 기준으로 idempotency를 보장한다.

적용 검증 문서는 `../05_QA_Validation/24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md`에 둔다. 이 적용 직후에는 KDB생명 `40869_policy`/`40870_policy` variant와 신한라이프 표준형/해약환급금 미지급형 variant가 남은 차단 항목이었다.

### 9-13. KDB/Shinhan Variant Resolution

2026-05-29 23:11 KST 기준 KDB생명과 신한라이프 차단 후보를 PDF 표지 텍스트 기준으로 재검수했다.

| 항목 | 결과 |
|---|---:|
| 재검수 source | 2 |
| 재검수 document row | 6 |
| 해소 source | 1 |
| 다음 seed 후보 document row | 2 |
| 제외 document row | 1 |
| 계속 차단 source | 1 |
| DB write | 0 |

KDB생명 `src_kdb_life_direct_cancer_202605`는 `40869_summary`가 상품요약서, `40870_policy`가 해약환급금 미지급형III 약관으로 확인되어 다음 seed 후보로 분리 가능하다. `40869_policy`는 `KDB다이렉트 암보험(갱신형)(무)` 표지라 제외한다.

신한라이프 `src_shinhan_life_sol_cancer_standard_202605`는 현재 확보된 상품요약서, 사업방법서, 판매약관이 모두 해약환급금 미지급형이다. 이 문서는 기존 `src_shinhan_life_sol_cancer_202601`에 연결된 no-refund 문서와 동일하므로, 표준형 source에는 재사용하지 않는다.

검수 결과는 `data/insurance/latest_kdb_shinhan_variant_resolution.json`, `data/insurance/latest_kdb_shinhan_variant_resolution.csv`, `../05_QA_Validation/26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md`에 둔다. 다음 seed PR은 KDB 문서 2건만 추가하고, 신한라이프 표준형 source는 일반형 공식 문서를 찾을 때까지 `raw` 상태로 유지한다.

---

## 10. 법무·신뢰 고지

서비스 문구는 다음 원칙을 따른다.

- 이 서비스는 보험 가입 권유 또는 판매가 아니라 정보 제공과 비교 보조를 목적으로 한다.
- 보험료는 공시 기준 또는 표준 조건 기준이며 실제 보험료와 다를 수 있다.
- 최종 가입 전 보험사 공식 상품설명서, 약관, 청약 단계의 고지사항을 확인해야 한다.
- 추천 결과는 유전자 위험 분석과 공개 상품정보의 매칭이며, 질병 진단 또는 의학적 판단이 아니다.

---

## 11. 구현 전 체크리스트

- [x] 생명보험협회 회원사 목록 수집 방식 확인
- [x] 손해보험협회 회원사 목록 수집 방식 확인
- [x] 보험다모아 상품 카테고리별 목록 수집 가능성 확인
- [x] 삼성생명/삼성화재 등 대표 보험사 공시실 PDF 다운로드 가능성 확인
- [x] 우체국금융 보험상품정보 OpenAPI 엔드포인트 확인
- [ ] 우체국금융 보험상품정보 OpenAPI 서비스키 기반 실제 호출 PoC
- [x] `scripts/insurance/collect-official-sources.mjs` Collector v1 작성
- [x] `data/insurance/latest_official_sources_snapshot.json` 생성 검증
- [x] 보험다모아 product code와 공식 상품 이동 URL 추출
- [x] `scripts/insurance/collect-product-documents.mjs` Product Document Probe v1 작성
- [x] 대표 상품 8개 공식 상품 페이지 접근성 확인
- [x] 대표 상품 중 한화생명 상품요약서/약관 PDF hash 확보
- [x] `scripts/insurance/collect-carrier-disclosures.mjs` Carrier Disclosure Crawler v1 작성
- [x] 삼성화재 다이렉트 실손의료비보험(2605.1) 공식 약관 PDF hash 확보
- [x] DB손보 공시실 JavaScript/API adapter로 약관/사업방법서/상품요약서 PDF hash 확보
- [x] `scripts/insurance/build-review-queue.mjs` Review Queue CSV v1 작성
- [x] `data/insurance/latest_insurance_review_queue.csv` 생성
- [x] hash-backed 7개 상품 매칭 키워드 정리 결과 작성
- [x] 보험상품 카탈로그 스키마 확장안 확정
- [x] 조건별 보험료 quote matrix 정책 문서화
- [x] `insurance_premium_quotes` migration 운영 DB 적용
- [x] P0 source 후보 quote row 24건 DB 적재
- [x] 실손의료보험 여성 조건 POST 파라미터 `L` 확인
- [x] source catalog 미등록 quote 60건을 연결할 quote-only raw source 후보 15개 seed 반영
- [x] 백업 후 quote-only source 후보 DB 적용 및 quote row 60건 추가 적재
- [x] quote-only raw source 15개 공식 상품 페이지/PDF 1차 probe
- [ ] quote-only raw source 미확보 후보 carrier별 공시/API adapter 보강
- [x] hash-backed quote-only 후보를 `insurance_source_documents` seed 후보로 정리
- [x] 백업 후 quote-only source document 8건 DB 적용
- [x] KDB생명 40869/40870 약관 variant 판정
- [x] 신한라이프 표준형/해약환급금 미지급형 문서 관계 판정
- [ ] KDB생명 source document 2건 seed 후보 추가
- [ ] 신한라이프 일반형 공식 문서 endpoint 추가 탐색
- [ ] PDF 원문 저장 정책 결정
- [ ] 보험사별 JavaScript/API 검색 어댑터로 공시실 crawler 보강
- [x] `insurance_carriers`, `insurance_source_documents`, `insurance_product_sources` 스키마 확정
- [x] P0 암보험 상품군 12개 샘플 파싱
- [x] P0 상품군 20개 이상 샘플 파싱
- [ ] 매칭 키워드 정리 UI 또는 CSV 포맷 결정
- [ ] 서비스 화면의 출처/확인일 표시 요구사항 확정

---

## 12. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 실제 보험상품 기반 추천으로 mock 상품 한계를 제거한다 |
| Potential Impact | 한국 보험상품 전체 카탈로그를 장기적으로 커버할 수 있는 데이터 기반을 만든다 |
| Novelty | 유전자 위험 분석과 공식 보험 공시자료를 연결하는 추천 구조를 만든다 |
| UX | 유저가 추천 이유, 출처, 확인일을 함께 확인할 수 있어 신뢰도가 높아진다 |
| Open-source | 수집/정규화 명세를 공개하면 다른 금융/헬스케어 빌더가 재사용할 수 있다 |
| Business Plan | 최신 상품 카탈로그와 결제 레일이 있어야 제휴·중개·구독 모델 검토가 가능하다 |

---

## 13. Related Documents

- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A와 Stage 18 전후 일정
- **Logic_Progress**: [AI Matching Pipeline](../04_Logic_Progress/AI_MATCHING_PIPELINE.md) - AI 설명과 DB 상품 추천의 경계
- **Technical_Specs**: [DB Schema](./DB_SCHEMA.md) - 현재 `insurance_products` 스키마와 확장 후보
- **Technical_Specs**: [Insurance Catalog Schema Extension](./02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 실제 보험상품 카탈로그 스키마 확장 확정안
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix와 seed 발행 정책
- **QA_Validation**: [Insurance Data Refresh QA](../05_QA_Validation/03_INSURANCE_DATA_REFRESH_QA.md) - 정기 갱신 검증 체크리스트
- **QA_Validation**: [Insurance Data Acquisition PoC](../05_QA_Validation/04_INSURANCE_DATA_ACQUISITION_POC_2026_05_27.md) - 공식 출처 수집 가능성 검증 결과
- **QA_Validation**: [Product Document Probe](../05_QA_Validation/05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 대표 상품 공식 문서/PDF hash 검증 결과
- **QA_Validation**: [Carrier Disclosure Crawler](../05_QA_Validation/06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 보험사 공시실 crawler v1 검증 결과
- **QA_Validation**: [Insurance Matching Queue](../05_QA_Validation/07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 매칭 키워드 정리 CSV 생성 결과
- **QA_Validation**: [Hash-backed Matching Keyword Review](../05_QA_Validation/08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - hash-backed 7개 상품 매칭 키워드 정리 결과
- **Technical_Specs**: [Insurance Matching Keyword Policy](./03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - DNA risk target과 보험상품 보장 키워드 매칭 기준
- **QA_Validation**: [Premium Quote Rows DB Apply](../05_QA_Validation/15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - source-aware quote row 적재 검증
- **QA_Validation**: [Medical Female Quote Params](../05_QA_Validation/17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md) - 실손 여성 조건 quote 파라미터 검증
- **QA_Validation**: [Source Catalog Quote Expansion](../05_QA_Validation/18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md) - quote-only raw source 후보 15개 확장 검증
- **QA_Validation**: [Source Catalog Quote DB Apply](../05_QA_Validation/19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only raw source 후보와 quote row 60건 추가 적용 검증
- **QA_Validation**: [Quote-only Source Document Probe](../05_QA_Validation/20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md) - quote-only 후보 공식 문서 hash 1차 probe
- **QA_Validation**: [KDB/Shinhan Variant Review](../05_QA_Validation/26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - KDB와 신한라이프 차단 후보 variant 재검수
