# [QA] E2E 테스트 결과 리포트

- **작성일**: 2026-04-10
- **최종 수정일**: 2026-04-10
- **레이어**: 05_QA_Validation
- **상태**: Pass v1.0

---

## 개요

Playwright(`@playwright/test`) 기반 E2E 테스트 suite를 구성하고 전체 통과를 확인함.

- **테스트 환경**: Chromium (Desktop), localhost:3000 (Next.js dev server)
- **실행 명령**: `npm run e2e`
- **총 케이스**: 21개
- **결과**: 21/21 통과 (100%)
- **총 소요 시간**: 약 7초

---

## 테스트 파일별 결과

### `tests/e2e/home.spec.ts` — 홈 페이지 (6개)

| 케이스 | 결과 |
|---|---|
| 페이지 200 응답 | PASS |
| 메인 헤드라인 표시 | PASS |
| 미인증 시 WalletConnect 버튼 노출 | PASS |
| 피쳐 카드 3개 렌더링 (TEE / ZKP / CI) | PASS |
| 배지 영역 표시 | PASS |
| 푸터 렌더링 | PASS |

### `tests/e2e/upload.spec.ts` — 업로드 페이지 (2개)

| 케이스 | 결과 |
|---|---|
| 미인증 시 홈(`/ko`)으로 리다이렉트 | PASS |
| 미인증 시 파일 입력 폼 미노출 | PASS |

### `tests/e2e/dashboard.spec.ts` — 대시보드 페이지 (2개)

| 케이스 | 결과 |
|---|---|
| `?sid` 파라미터 없을 때 `/ko/upload` 리다이렉트 | PASS |
| 존재하지 않는 `sid` 값으로 접근 시 `/ko/upload` 리다이렉트 | PASS |

### `tests/e2e/pitch.spec.ts` — 피치덱 페이지 (9개)

| 케이스 | 결과 |
|---|---|
| 페이지 200 응답 | PASS |
| 첫 슬라이드 표시 (Slide 1 / 12) | PASS |
| 프로그레스 닷 12개 렌더링 | PASS |
| 첫 슬라이드에서 Prev 버튼 비활성화 | PASS |
| Next 버튼 클릭 시 슬라이드 2로 이동 | PASS |
| 마지막 슬라이드에서 Next 버튼 비활성화 | PASS |
| ArrowRight 키보드로 다음 슬라이드 이동 | PASS |
| ArrowLeft 키보드로 이전 슬라이드 이동 | PASS |
| 닷 클릭으로 임의 슬라이드 이동 | PASS |

### `tests/e2e/checkout.spec.ts` — 체크아웃 페이지 (2개)

| 케이스 | 결과 |
|---|---|
| 유효하지 않은 cartId → `/ko/upload` 리다이렉트 | PASS |
| 존재하지 않는 cartId → `/ko/upload` 리다이렉트 | PASS |

---

## 커버리지 범위 및 한계

### 커버됨
- 공개 접근 가능한 모든 페이지의 기본 렌더링
- 인증 가드 리다이렉트 동작 (upload, dashboard, checkout)
- 피치덱 슬라이드 네비게이션 전체 (클릭 + 키보드)
- 잘못된 파라미터/ID에 대한 방어 처리

### 미커버 (정당한 사유)

| 항목 | 사유 |
|---|---|
| NEAR 지갑 연결 플로우 | 실제 지갑 확장 프로그램 의존, E2E 환경에서 자동화 불가 |
| TEE 분석 전체 플로우 | Phase 0 Mock이지만 지갑 인증 선행 필요 |
| 결제 트랜잭션 | NEAR Testnet 계정 및 실제 서명 필요 |
| 다국어(en) 전환 | 핵심 플로우와 동일 로직, 우선순위 낮음 |

---

## 실행 방법

```bash
# headless 실행 (CI/기본)
npm run e2e

# 시각적 UI 모드 (디버깅)
npm run e2e:ui

# 마지막 리포트 열기
npm run e2e:report
```

---

## 관련 문서
- [보안 체크리스트](./SECURITY_CHECKLIST.md)
- [1차 모의 평가](./01_MOCK_EVALUATION_V1.md)
- [구현 계획](../04_Logic_Progress/IMPLEMENTATION_PLAN.md)
