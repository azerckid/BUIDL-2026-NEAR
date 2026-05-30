# [QA] 한화생명 0원 Quote Blocker 해소 Probe
> Created: 2026-05-31 00:49
> Last Updated: 2026-05-31 00:49

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 보험다모아에서 `0원`으로 수집된 한화생명 e암보험 표준체형/비흡연체형 quote를 한화생명 공식 다이렉트 계산 API로 재조회
- **결론**: 한화생명 공식 상품 페이지와 계산 API를 기준으로 34세/44세 남성/여성, 표준체형/비흡연체형 총 8개 숫자 KRW quote를 확보했다. 이번 PR은 DB write 없이 수집 스크립트와 산출물만 추가하며, 추천 노출은 후속 seed/apply PR에서 처리한다.

---

## 1. 변경 대상

| 파일 | 변경 |
|---|---|
| `scripts/insurance/probe-hanwha-life-quotes.mjs` | 한화생명 공식 상품 페이지와 계산 API 기반 quote probe 추가 |
| `package.json` | `npm run collect:insurance:hanwha-quotes` 명령 추가 |
| `data/insurance/latest_hanwha_life_quote_blocker_probe.json` | 공식 carrier quote 산출물 |
| `data/insurance/latest_hanwha_life_quote_blocker_probe.csv` | quote row 요약 CSV |
| `docs/03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md` | 한화생명 carrier quote probe 단계 기록 |
| `docs/04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md` | 한화생명 blocker 해소 정책 기록 |
| `docs/04_Logic_Progress/ROADMAP.md` | 남은 구현 순서 4번 완료 기록 |

---

## 2. 공식 출처와 기준

| 항목 | 값 |
|---|---|
| 공식 상품 페이지 | `https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer` |
| 계산 API | `https://api.hanwhalife.com/product/calculate/v3/default` |
| 상품 코드 | `CMS00012` |
| 상품명 | 한화생명 e암보험(비갱신형) 무배당 |
| 상품 버전 | 55 |
| 상품 기준일 | 20260529 |
| 조회 기준일 | 2026-05-31 |
| 보험료 기준 | 100세 만기, 20년납, 월납, 주계약가입금액 1,000만원 |
| quote source type | `carrier_quote` |

한화생명 공식 상품 페이지의 예시 보험료 6건을 함께 읽고, 계산 API의 40세 남성/여성 표준체형 결과가 페이지 예시와 일치하는지 검증했다.

---

## 3. 결과 요약

| 항목 | 결과 |
|---|---:|
| 보험다모아 기존 0원 quote row | 8 |
| 공식 carrier numeric quote row | 8 |
| 공식 페이지 HTTP status | 200 |
| 공식 페이지 예시 보험료 row | 6 |
| 40세 남성 표준체형 API/page 일치 | true |
| 40세 여성 표준체형 API/page 일치 | true |
| DB write | 0 |
| seed 변경 | 0 |
| 추천 노출 변경 | 0 |

---

## 4. 확보 Quote Row

| Source | 조건 | 체형 | 보험료 |
|---|---|---|---:|
| `src_hanwha_life_e_cancer_202604` | 34세 남성 | 표준체형 | 14,840원 |
| `src_hanwha_life_e_cancer_202604` | 34세 여성 | 표준체형 | 10,950원 |
| `src_hanwha_life_e_cancer_202604` | 44세 남성 | 표준체형 | 18,680원 |
| `src_hanwha_life_e_cancer_202604` | 44세 여성 | 표준체형 | 12,170원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34세 남성 | 비흡연체형 | 13,460원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34세 여성 | 비흡연체형 | 10,850원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44세 남성 | 비흡연체형 | 16,820원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44세 여성 | 비흡연체형 | 12,060원 |

---

## 5. 판정

한화생명 2개 source의 가격 blocker는 "숫자 KRW quote 미확보" 관점에서는 해소됐다. 다만 보험다모아 quote row를 그대로 승인하는 것이 아니라, 한화생명 공식 계산 API의 `carrier_quote` row로 대체해야 한다.

따라서 이번 PR의 범위는 수집 근거 확정까지다. 사용자 추천 노출을 늘리려면 후속 PR에서 아래를 처리한다.

1. `seed.ts`의 한화생명 quote row를 공식 carrier quote 기준으로 갱신한다.
2. 한화생명 표준체형/비흡연체형 source status와 quote status를 `approved`로 승격한다.
3. 한화생명 `insurance_products` snapshot 2건을 생성한다.
4. 운영 DB 백업 후 seed apply PR로 실제 DB를 갱신한다.

---

## 6. 안전성

- 이번 PR은 운영 DB에 쓰지 않는다.
- 기존 approved 상품 3건과 Test Pilot 플로우에는 영향을 주지 않는다.
- 한화생명 API 응답에는 `sskey`처럼 호출마다 달라질 수 있는 값이 포함되므로, 산출물에는 raw API response hash와 별도로 stable quote hash를 저장한다.
- 보험료 기준은 공식 계산 API 기준이며, 최종 가입 보험료는 보험사 청약 단계에서 달라질 수 있다는 caveat를 유지한다.

---

## 7. 검증 명령

```bash
npm run collect:insurance:hanwha-quotes -- --as-of-date 2026-05-31
node --check scripts/insurance/probe-hanwha-life-quotes.mjs
npx eslint scripts/insurance/probe-hanwha-life-quotes.mjs --quiet
node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync("data/insurance/latest_hanwha_life_quote_blocker_probe.json","utf8")); if (j.quote_rows.length!==8) throw new Error("quote row mismatch"); if (!j.qa.blocker_resolved) throw new Error("blocker not resolved"); console.log("hanwha quote probe ok")'
git diff --check
```

| 검증 | 결과 |
|---|---|
| 한화생명 공식 quote probe | PASS. 8/8 numeric quote |
| Node syntax check | PASS |
| ESLint 변경 스크립트 | PASS |
| 산출물 row/blocker 검증 | PASS |
| whitespace diff check | PASS |

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | `0원` 때문에 추천에서 제외된 실제 암보험 2개를 공식 quote 기반 후보로 복구할 수 있다 |
| Potential Impact | active source-backed 추천 상품 수를 3개에서 5개로 늘릴 준비가 됐다 |
| Novelty | 보험다모아 quote 실패를 보험사 공식 계산 API로 보완하는 fallback 패턴을 만든다 |
| UX | 사용자에게 0원 또는 가격 미확정 상품을 보여주지 않고 숫자 보험료 근거를 확보한다 |
| Open-source | carrier quote probe를 다른 보험사 가격 blocker에도 재사용할 수 있다 |
| Business Plan | 실제 상품 추천 커버리지를 늘려 테스트 사용자의 체감 가치를 높인다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - carrier quote fallback 단계
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 남은 구현 순서 4번 완료 기록
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - quote source와 승인 정책
- **QA_Validation**: [Matching Keyword Caveat Review](./30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 한화생명 가격 blocker 최초 판정
- **QA_Validation**: [Premium Quote Personalization](./41_PREMIUM_QUOTE_PERSONALIZATION_2026_05_31.md) - approved quote matrix UI 연결
- **Data**: [Hanwha Life Quote Blocker Probe JSON](../../data/insurance/latest_hanwha_life_quote_blocker_probe.json) - 공식 carrier quote 산출물
- **Data**: [Hanwha Life Quote Blocker Probe CSV](../../data/insurance/latest_hanwha_life_quote_blocker_probe.csv) - quote row 요약
