# [QA] 보험사 공시실 PDF Crawler v1.1 결과
> Created: 2026-05-27 13:23
> Last Updated: 2026-05-28 01:50

- **레이어**: 05_QA_Validation
- **상태**: Crawler v1.1 완료
- **범위**: `latest_product_document_probe.json`에서 PDF hash가 없는 대표 상품을 대상으로 보험사 공시실/상품공시 페이지를 추가 탐색
- **결론**: 공시실 페이지 접근과 보수적 상품명 매칭은 가능하다. v1.1에서 삼성생명, 현대해상, 신한라이프 공시/상품 JavaScript API adapter를 추가해 PDF hash 확보 문서가 4개에서 9개로 증가했다. 남은 핵심 공백은 KB손보의 별도 문서 다운로드 경로와 DB생명 상품명 매칭이다.

---

## 1. 실행 명령

```bash
npm run collect:insurance:disclosures
```

출력 파일은 다음과 같다.

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_carrier_disclosure_probe.json` | 보험사 공시실 접근성, 상품명 매칭, PDF/hash 결과 |

---

## 2. 실행 결과

| 항목 | 결과 |
|---|---|
| 대상 상품 | 7개 |
| 공시실 profile 적용 보험사 | 7개 |
| 공시실 페이지 접근 | 7개 성공 |
| PDF hash 확보 | 9개 |
| hash 확보 상품 | 삼성생명 인터넷 입원 건강보험 통합약관, 삼성화재 다이렉트 실손의료비보험 약관, DB손보 다이렉트 실손의료비보험 약관/사업방법서/상품요약서, 현대해상 다이렉트실손의료비보장보험 약관, 신한SOL암보험 상품요약서/사업방법서/판매약관 |

확보 PDF hash:

| 문서 | URL | SHA-256 |
|---|---|---|
| 삼성생명 통합약관 | `https://direct.samsunglife.com/contents/policy_was/%EA%B8%B0%ED%83%80_%EC%82%BC%EC%84%B1%20%EC%9D%B8%ED%84%B0%EB%84%B7%20%EC%9E%85%EC%9B%90%20%EA%B1%B4%EA%B0%95%EB%B3%B4%ED%97%98(2601)(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%EB%AC%B4%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%ED%98%95)_%ED%86%B5%ED%95%A9%EC%95%BD%EA%B4%80_20260101.pdf` | `ce40ecf0629246dd761d63c9badbc04d32e74839fce8a4d74176277b8e5d1363` |
| 삼성화재 약관 | `https://direct.samsungfire.com/docs/realloss.pdf` | `db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415` |
| DB손보 약관 | `https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%95%BD%EA%B4%80_31227(00)_20260506.pdf` | `db24ea2e2dbf2f4200d0aabe86d92a26e0b3d4962e521f99a6ee35f901997074` |
| DB손보 사업방법서 | `https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%82%AC%EB%B0%A9_31227(00)_20260506.pdf` | `3a7a855b44c2d58eb0845cb4031ce8e71e62241fbe3987a9c3895e5ecfb27019` |
| DB손보 상품요약서 | `https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%9A%94%EC%95%BD_31227(00)_20260506.pdf` | `334fd0bd1c7d49e1729b8584eefbb7bd02cdb5112de6e8371357be09befc77ac` |
| 현대해상 약관 | `https://mdirect.hi.co.kr/dhNAS/terms/CM12M2_20260506.pdf` | `af92c7ee0f31d3aaf8eb4f05f9918b81795405bb51dbeb5346dbff910aea5f4a` |
| 신한라이프 상품요약서 | `https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__media/%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9_%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf` | `d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03` |
| 신한라이프 사업방법서 | `https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__etc/%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%20%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf` | `9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea` |
| 신한라이프 판매약관 | `https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__etc/%ED%8C%90%EB%A7%A4%EC%95%BD%EA%B4%80_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%20%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf` | `fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa` |

---

## 3. 보험사별 상태

| 보험사 | 상태 | 해석 |
|---|---|---|
| 삼성생명 | `hashed` | 다이렉트 보험 문서 API에서 보험다모아 유입 상품의 통합약관 PDF hash 확보 |
| 삼성화재 | `hashed` | 공식 direct docs PDF에서 약관 hash 확보 |
| DB손보 | `hashed` | 공시실 검색 API에서 2605 실손 상품 row와 문서 파일명 확보 후 PDF hash 3개 확보 |
| 현대해상 | `hashed` | 다이렉트 상품 페이지의 DH.json 상품 설명 API에서 약관 PDF hash 확보 |
| 신한라이프생명 | `hashed` | 상품공시 wcms API에서 판매중 상품 row와 상품요약서/사업방법서/판매약관 hash 확보 |
| KB손보 | `matched_without_document_links` | 공시/가격 페이지에서 26.05 실손 상품명 row는 찾았지만 문서 링크가 없음 |
| DB생명 | `no_match` | 공시실 표 접근 가능. 이름이 다른 암보험 row는 false positive로 제외됨 |

---

## 4. 보수적 매칭 기준

공시실 row와 보험다모아 상품명이 일부 단어만 공유하는 경우는 hash 대상으로 승격하지 않는다.

이번 실행에서 DB생명 `(무)e로운 암보험(해약환급금 미지급형)(2601)`은 DB생명 공시실의 `(무)AI 라이프케어 암보험(2605)`과 단어 일부를 공유했지만, 매칭 점수 `0.3333`으로 임계값 `0.5` 미만이므로 제외했다.

이 기준은 false positive를 줄이는 데 필요하다. 실제 서비스용 seed 승격은 hash 확보만으로도 부족하며, 상품명·판매상태·보험료 기준·보장 카테고리·위험 타깃 검수가 필요하다.

---

## 5. 다음 작업

1. KB손보 공시 row에서 별도 다운로드 파라미터 또는 fileNm API를 추적한다.
2. `latest_official_sources_snapshot.json`, `latest_product_document_probe.json`, `latest_carrier_disclosure_probe.json`을 결합한 검수 CSV를 운영한다.
3. hash와 사람이 승인한 상품만 `review_status=needs_review` 또는 seed 후보로 승격한다.

---

## 6. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집 파이프라인과 정기 실행 명세
- **QA_Validation**: [Product Document Probe](./05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 공식 상품 페이지/PDF hash 1차 검증
- **QA_Validation**: [Insurance Data Refresh QA](./03_INSURANCE_DATA_REFRESH_QA.md) - 정기 갱신 검증 체크리스트
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 검수 CSV 생성 결과
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 작업 일정
- **Data**: [Latest Carrier Disclosure Probe](../../data/insurance/latest_carrier_disclosure_probe.json) - 공시실 crawler v1.1 실행 결과
