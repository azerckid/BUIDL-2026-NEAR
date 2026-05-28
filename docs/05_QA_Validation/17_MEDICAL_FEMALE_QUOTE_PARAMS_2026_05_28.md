# [QA] 실손의료보험 여성 Quote 파라미터 검증
> Created: 2026-05-28 23:51
> Last Updated: 2026-05-28 23:51

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 보험다모아 모바일 5세대 실손의료보험 여성 조건 HTTP 500 원인 확인, crawler 수정, quote row 추가 적재
- **결론**: 실손의료보험 모바일 화면의 여성 성별 값은 `F`가 아니라 `L`이다. `sexDiv=F`, `sex=F`는 HTTP 500을 재현했고, `sexDiv=L`, `sex=L`은 HTTP 200과 9개 상품 row를 반환했다. 수정 후 source-aware 후보와 매칭되는 여성 실손 quote row 8건을 Turso DB에 `needs_review` 상태로 추가 적재했다.

---

## 1. 원인

모바일 실손의료보험 페이지의 성별 버튼은 다음 값을 사용한다.

| 화면 버튼 | Submit 값 |
|---|---|
| 남자 | `M` |
| 여자 | `L` |
| 전체 | `ALL` -> hidden `sex=M`, `sex=L`, `sexDiv=ML` |

따라서 기존 `F` 값은 보험다모아 실손의료보험 모바일 POST 파라미터로 유효하지 않았다.

---

## 2. 요청 비교

| 조건 | 파라미터 | HTTP | 추출 row | 판단 |
|---|---|---:|---:|---|
| 기존 여성 요청 | `sexDiv=F`, `sex=F` | 500 | 0 | 오류 재현 |
| 수정 여성 요청 | `sexDiv=L`, `sex=L` | 200 | 9 | 해소 |
| 수정 여성 요청 + hidden pair | `sexDiv=L`, `sex=`, `sex=L` | 200 | 9 | 화면 submit 구조와 가장 유사 |

현재 crawler는 기존 male 조건과의 일관성을 위해 단일 `sex=L` 값을 사용한다. 서버는 단일 `sex=L`과 hidden pair 모두 HTTP 200을 반환한다.

---

## 3. 가입담보 범위 판단

보험다모아 모바일 화면의 기본 체크 상태는 `A/B` 외에 `E/F/G/H/I/J` 특약도 포함한다. 그러나 PR #12에서 이미 DB에 적재된 quote row는 `A/B` 기준이다. 전체 특약 조합은 보험료 기준이 크게 달라지므로, 이번 PR에서는 기존 A/B 기준을 유지해 여성 성별 코드만 해소한다.

예시 비교:

| 조건 | 상품 | A/B 보험료 | A/B+E~J 보험료 |
|---|---|---:|---:|
| 34세 남성 | KB손보 실손 | 6,400 | 11,241 |
| 34세 여성 | KB손보 실손 | 6,439 | 11,767 |
| 44세 남성 | KB손보 실손 | 9,074 | 15,272 |
| 44세 여성 | KB손보 실손 | 10,323 | 19,808 |

E~J 특약 조합은 후속 crawler에서 `riders_json` 또는 별도 quote dimension으로 확장한다.

---

## 4. 산출물 갱신

| 항목 | 이전 | 이후 |
|---|---:|---:|
| source probe | 8 | 8 |
| HTTP error source | 2 | 0 |
| raw quote row | 66 | 84 |
| source-aware 매칭 quote row | 16 | 24 |
| Turso DB `insurance_premium_quotes` row | 16 | 24 |
| review status | `needs_review` | `needs_review` |

갱신 파일:

| 파일 | 역할 |
|---|---|
| `scripts/insurance/probe-premium-quotes.mjs` | 여성 실손 코드를 `L`로 수정 |
| `scripts/insurance/apply-premium-quotes.mjs` | 의미상 중복 quote row skip 추가 |
| `data/insurance/latest_premium_quote_probe.json` | 84개 raw quote row 산출물 |
| `data/insurance/latest_premium_quote_rows_apply.json` | 8건 추가 적재 결과 |

---

## 5. DB 적용

적용 전 백업:

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-medical-female-quotes-20260528T144942Z.sql` |
| SHA-256 | `443e0dd5470a5737148e998c0c4d67283b030c5cebd3c72f34df2f124182cb14` |
| 적용 전 `insurance_premium_quotes` | 16 |

Dry-run 결과:

```text
Probe quote rows: 84
Matched source rows: 24
Semantic duplicates: 16
Insert candidates: 8
Table count: 16 -> 16
```

Apply 결과:

```text
Probe quote rows: 84
Matched source rows: 24
Semantic duplicates: 16
Insert candidates: 8
Inserted rows: 8
Table count: 16 -> 24
```

---

## 6. 추가 적재된 여성 실손 Quote

| Source ID | 조건 | 성별 코드 | 월 보험료 KRW |
|---|---|---|---:|
| `src_kb_direct_medical_202605` | 34세 여성 | `L` | 6,439 |
| `src_hyundai_direct_medical_202605` | 34세 여성 | `L` | 6,545 |
| `src_db_direct_medical_202605` | 34세 여성 | `L` | 6,854 |
| `src_samsung_fire_direct_medical_202605` | 34세 여성 | `L` | 7,503 |
| `src_hyundai_direct_medical_202605` | 44세 여성 | `L` | 9,949 |
| `src_kb_direct_medical_202605` | 44세 여성 | `L` | 10,323 |
| `src_db_direct_medical_202605` | 44세 여성 | `L` | 11,030 |
| `src_samsung_fire_direct_medical_202605` | 44세 여성 | `L` | 11,938 |

---

## 7. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_premium_quotes` 전체 row | 24 |
| `review_status=needs_review` | 24 |
| male quote row | 12 |
| female quote row | 12 |
| invalid `quote_hash_sha256` | 0 |
| semantic duplicate key | 0 |

Source별 row count:

| Source ID | Row | Male | Female |
|---|---:|---:|---:|
| `src_hanwha_life_e_cancer_202604` | 4 | 2 | 2 |
| `src_shinhan_life_sol_cancer_202601` | 4 | 2 | 2 |
| `src_db_direct_medical_202605` | 4 | 2 | 2 |
| `src_kb_direct_medical_202605` | 4 | 2 | 2 |
| `src_samsung_fire_direct_medical_202605` | 4 | 2 | 2 |
| `src_hyundai_direct_medical_202605` | 4 | 2 | 2 |

---

## 8. 남은 작업

1. `needs_review` quote row의 `approved` 승격 기준을 정한다.
2. source catalog 미등록 60개 quote row 중 P0 질병/암/실손 상품을 원천 후보로 확장한다.
3. 가입담보 `E~J` 특약 조합을 별도 quote dimension으로 수집한다.
4. UI에서 대표 보험료와 조건별 예상 보험료를 분리 표시한다.

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - quote table 설계
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 작업 일정
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 관리 방침
- **QA_Validation**: [Premium Quote Matrix PoC](./12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - 최초 quote matrix PoC
- **QA_Validation**: [Premium Quote Rows DB Apply](./15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - 최초 16건 quote row 적재 검증
- **QA_Validation**: [PR Review Operating Checklist](./16_PR_REVIEW_OPERATING_CHECKLIST_2026_05_28.md) - DB write/PR 리뷰 운영 기준
