# [QA] Test Pilot Mode DB Migration 0007 적용 검증
> Created: 2026-05-30 18:50
> Last Updated: 2026-05-30 18:50

- **레이어**: 05_QA_Validation
- **상태**: Completed
- **범위**: Turso DB schema migration `drizzle/0007_silky_magma.sql`
- **결론**: 백업 생성 후 `test_pilot_checkouts` 테이블 migration을 Turso DB에 적용했고, 신규 테이블, unique/index, FK, Drizzle migration 기록이 모두 확인됐다. Test Pilot E2E는 다음 단계로 남는다.

---

## 1. 대상 환경

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 적용 migration | `drizzle/0007_silky_magma.sql` |
| 적용 명령 | `npx drizzle-kit migrate` |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-test-pilot-0007-20260530T094823Z.sql` |
| 백업 SHA-256 | `daadd6ae6e78b00eeeddd30e923f1fa6d17542ee441c7467debf3e6ade457878` |
| 백업 테이블 수 | 12 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-before-test-pilot-0007-20260530T094823Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-after-test-pilot-0007-20260530T095030Z.post.json` |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `__drizzle_migrations` | 7 |
| `analysis_results` | 70 |
| `analysis_sessions` | 78 |
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_premium_quotes` | 84 |
| `insurance_products` | 8 |
| `recommendation_carts` | 64 |
| `transactions` | 45 |
| `user_profiles` | 2 |

사전 검증에서 `test_pilot_checkouts` 테이블은 존재하지 않았다.

---

## 3. 적용

```bash
npx drizzle-kit migrate
```

결과:

```text
migrations applied successfully
```

이번 migration은 신규 테이블 생성만 수행한다. 기존 row 삭제, 기존 컬럼 삭제, 기존 타입 변경은 없다.

---

## 4. 사후 검증

적용 후 Turso DB를 읽기 전용 query로 검증했다.

| 항목 | 결과 |
|---|---|
| 전체 테이블 수 | 13 |
| `test_pilot_checkouts` 존재 | true |
| `test_pilot_checkouts` row count | 0 |
| `__drizzle_migrations` row count | 8 |
| 기존 핵심 row count | 백업 직전과 동일 |

### 4-1. 컬럼

| 컬럼 | 타입 | Not Null | PK | Default |
|---|---|---:|---:|---|
| `id` | TEXT | 1 | 1 | null |
| `cart_id` | TEXT | 1 | 0 | null |
| `wallet_address` | TEXT | 1 | 0 | null |
| `selected_product_ids` | TEXT | 1 | 0 | null |
| `total_monthly_usdc` | REAL | 1 | 0 | null |
| `status` | TEXT | 1 | 0 | `'completed'` |
| `disclaimer_accepted` | INTEGER | 1 | 0 | null |
| `created_at` | INTEGER | 1 | 0 | null |

### 4-2. 인덱스

| 인덱스 | 목적 |
|---|---|
| `sqlite_autoindex_test_pilot_checkouts_1` | primary key 자동 인덱스 |
| `test_pilot_checkouts_cart_id_unique` | cart별 중복 test checkout 방지 |
| `test_pilot_checkouts_wallet_idx` | guest identity 기준 조회 |

### 4-3. Foreign Key

| From | To |
|---|---|
| `test_pilot_checkouts.cart_id` | `recommendation_carts.id` |
| `test_pilot_checkouts.wallet_address` | `user_profiles.wallet_address` |

---

## 5. 안전성 확인

| 항목 | 결과 |
|---|---|
| DB URL/token 문서 노출 | 없음 |
| 백업 파일 Git 포함 | 없음 |
| 기존 테이블 row count 변화 | 없음 |
| 신규 test checkout row | 0 |
| 운영 결제 `transactions` row 변화 | 없음 |

---

## 6. 남은 작업

1. Test Pilot 환경변수 활성화:

```env
TEST_PILOT_ENABLED=true
NEXT_PUBLIC_TEST_PILOT_ENABLED=true
TEST_PILOT_SKIP_WALLET=true
TEST_PILOT_SKIP_PAYMENT=true
```

2. E2E 실행:

```text
테스트로 시작 -> 업로드 -> TEE 분석 -> 추천 확인 -> 결제 없이 테스트 신청 완료
```

3. E2E 후 검증:
    - `test_pilot_checkouts` row가 1건 증가한다.
    - 해당 cart가 `recommendation_carts.status='checked_out'`으로 전환된다.
    - `transactions` row가 증가하지 않는다.

---

## 7. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | Test Pilot no-payment checkout 저장소가 운영 DB에 준비됐다 |
| Potential Impact | 테스트 사용자가 결제 없이 전체 플로우를 완료할 수 있는 DB 기반이 생겼다 |
| Novelty | 실제 Web3 payment row와 테스트 completion row를 분리한다 |
| UX | 테스트 플로우 마지막 단계에서 지갑 서명과 결제를 제거할 수 있다 |
| Open-source | 백업, migration, 사후 검증 절차가 문서로 재현 가능하다 |
| Business Plan | 실제 결제 전환 전 테스트 신청 funnel 데이터를 수집할 수 있다 |

---

## 8. Related Documents

- **Technical_Specs**: [Test Pilot Mode Spec](../03_Technical_Specs/04_TEST_PILOT_MODE_SPEC_2026_05_30.md) - 무로그인·무결제 테스트 플로우 정책
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - `test_pilot_checkouts` schema
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Test Pilot Mode 진행 상태
- **QA_Validation**: [No-payment Checkout Implementation QA](./37_TEST_PILOT_NO_PAYMENT_CHECKOUT_2026_05_30.md) - 코드 구현과 migration 생성 검증
