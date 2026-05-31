# [로드맵] 유전자 기반 AI 보험 설계 프로젝트 추진 일정
> Created: 2026-03-31 00:00
> Last Updated: 2026-05-31 19:33

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-05-31 (농협손보 실손 매칭 검수)
- **레이어**: 04_Logic_Progress
- **상태**: Draft v3.46
- **phase**: Phase 2

---

## 1. 마일스톤 요약 (Milestone Summary)

### Phase 0: 해커톤 데모 (NEAR Buidl 2006)
- **기간**: 2026-04-01 ~ 2026-04-20 (해커톤 제출 데드라인 기준)
- **목표**: 심사위원에게 핵심 가치 전달 가능한 인터랙티브 데모 완성.
- **산출물**:
  - Next.js 기반 웹 DApp — 5단계 User Flow UI 구현 (Step 1~5 화면 전환).
  - NEAR Testnet 지갑 연결 및 더미 보험 카탈로그 조회 동작.
  - IronClaw TEE 연동 + Intel TDX Attestation 검증 UI (실제 NEAR AI Cloud 엔드포인트 호출, Mock 아님).
  - Confidential Intents Testnet에서의 더미 결제 트랜잭션 데모.
- **데모 발표 포인트**: TEE 분석 → Intel TDX Attestation 배지 → Memory Purge 애니메이션 → ZKP 증명 → 기밀 결제 흐름을 한 번에 보여주는 5분 시연 시나리오.

### Phase 1: MVP 개발 및 개념 증명 (PoC)
- **The Secret Keeper 시제품 검증**: 사용자가 유전자 결과 텍스트를 입력하면 분석 리포트와 보험 추천 근거를 대화로 제공하는 에이전트 로직 검증.
- **텔레그램 에이전트와 웹 DApp의 관계**: Phase 1에서는 텔레그램 봇을 빠른 프로토타입 채널로 활용. 사용자가 DTC 결과 텍스트를 텔레그램에 붙여넣으면 AI가 요약 리포트를 반환하는 방식으로 분석 로직(AI 모델 + 보험 매칭 엔진)을 먼저 검증. **Phase 2 이전에 동일한 분석 백엔드를 웹 DApp으로 전환**하며, 텔레그램 봇은 알림/리밸런싱 알람 채널로 역할 축소.
- NEAR Protocol 기반의 기본 계정 및 프라이빗 스토리지 연동.
- 기존 보험 증권 분석을 통한 보장 공백 진단 로직 구현.

### Phase 2: NEAR TEE 및 프라이버시 스택 통합
- **Confidential Intents + USDC 결제 레일 재검토**: 2026-05 NEAR AI의 USDC + Confidential Intents 통합을 기준으로 보험료 결제 Layer 3를 재설계. SDK/엔드포인트는 실측 전까지 확정하지 않음.
- **Noir ZKP 온체인 수학적 검증**: `@aztec/bb.js` 기반 실제 proof 생성 및 NEAR 컨트랙트 제출.
- **MPC Chain Signatures 고도화**: v1.signer 실연동으로 NEAR 지갑 하나로 ETH/SOL 보험료 결제 지원.
- **NEAR AI Cloud 연동 고도화**: Qwen 30B 이상 모델 활용, TEE 내부 분석 정확도 향상.
- **AI 상담 레이어 추가 (부가 기능)**: TEE 분석 후 생성된 위험 레이블을 컨텍스트로 주입하여, 사용자가 보험·질병 관련 질문을 할 수 있는 채팅 인터페이스 제공. LLM 내장 지식 기반 답변, Stateless 설계. 세부 구현 명세는 `SECRET_KEEPER_IMPL_SPEC.md` 참조.
- 암호화된 유전자 Raw Data(VCF 등)의 안전한 로딩 및 처리 테스트.
- 실제 보험상품 카탈로그 고도화: 생명보험협회/손해보험협회/보험다모아/우체국보험 API 후보를 기준으로 seed 데이터를 공시 기반 상품으로 교체.
- 보험사 API 또는 공시 데이터 연동 및 상품 매칭 엔진 고도화.
- Confidential Intents 테스트넷 → 메인넷 전환 대응.

### Phase 3: 완전 격리 TEE 파이프라인 + 정식 서비스 런칭

**핵심 목표**: 유전자 데이터가 TEE 외부로 단 한 바이트도 노출되지 않는 완전 격리 파이프라인 완성.
현재 LLM 분석만 TEE 안에 있으며, 파일 파싱 / ZKP 생성 / risk_score 도출을 TEE 안으로 옮기는 것이 Phase 3의 핵심.

**선행 조건(2026-05-27 재검토)**: 로컬 IronClaw CLI는 v0.26.0이며, 공개 릴리스는 v0.28.2까지 확인했다. v0.29.0과 PR #3122는 공개 근거 확인 전까지 로드맵 전제로 두지 않는다. 블로커 2~3은 v0.28.0~v0.28.2로 재실측하고, 블로커 1은 NEAR AI 팀 확인이 계속 필요하다. 상세는 `PHASE3_BLOCKERS_AND_INQUIRY.md` 참조.

**예상 일정**:
- **Q2 2026**: IronClaw v0.28.2 재검증 → NEAR AI 문의 보강 → TEE 복호화 경로 확보 → WASM 툴 cloud 등록
- **Q3 2026**: 완전 격리 파이프라인 완성 → Barretenberg 교체 → 외부 보안 감사
- **Q4 2026**: Confidential Intents 메인넷 전환 → 보험사 파트너십 → 베타 서비스
- **Q1 2027**: 글로벌 런칭 (싱가포르, 유럽) → 멀티체인 통합 → 토큰 이코노미

**구현 체크리스트 상세**: Stage 18 (아래) 참조

---

### 2026-05-27 적용 업데이트: 두 기둥 실행 트랙

| 트랙 | 핵심 질문 | 다음 작업 |
|---|---|---|
| 실제 보험상품 카탈로그 | 실제 판매 상품과 조건별 보험료를 어떤 공식 출처로 검증하고 주기적으로 갱신할 것인가 | Test Pilot Mode에서 source-backed 추천을 무로그인·무결제로 끝까지 체험 가능하게 구현 |
| NEAR 프라이버시 기술 | IronClaw v0.28.2까지의 업데이트가 블로커 2~3을 해소하는가 | WIT-compatible WASM runtime, `tool_install`, WASM 실행 결과 반환 경로 실측 |
| 매칭 브리지 | AI 해석과 DB 상품 추천의 경계를 어떻게 유지할 것인가 | `riskProfile.flags` -> `insurance_products.risk_targets` 결정론적 매칭 유지 |

### 2026-05-30 현재 남은 구현 순서

현재 의미는 “실제 보험상품 데이터 기반 추천”과 “무로그인·무결제 테스트 완주”를 동시에 검증하는 것이다. Test Pilot happy-path는 완료됐고, 다음 작업은 아래 순서로 진행한다.

여기서 현재 추천 상품 10개는 “수집한 전체 데이터 수”가 아니라 “사용자 추천 화면에 노출 가능한 최종 snapshot 수”다. 현재까지 확보한 기반 데이터는 보험다모아 P0 샘플 56개, source catalog 후보 22개, 공식 문서 row 22개, 조건별 보험료 quote row 92개이며, 이 중 원천 근거, 매칭 키워드, caveat, approved quote를 통과해 active 추천으로 발행된 상품이 10개다. 실손 baseline 남성 조건 quote 6건, 삼성화재 quote 4건, 신한라이프 quote 4건도 운영 DB에 approved로 반영되어 조건별 보험료 approved row는 40건이다.

| 순서 | 트랙 | 작업 | 완료 기준 |
|---:|---|---|---|
| 1 | Test Pilot UX | guest session dashboard 상품 버튼 문구를 `결제하기`에서 `테스트 신청하기`로 정리 | 테스트 사용자가 실제 결제처럼 오해하지 않음 |
| 2 | Test Pilot 회귀 | flag off 상태의 기존 지갑 연결, NEAR/ETH checkout, build/typecheck 확인 | 테스트 모드가 운영 결제 경로를 깨지 않음 |
| 3 | 보험료 개인화 | 사용자 나이/성별 입력값과 approved quote matrix 연결 | 대표 보험료와 사용자 조건별 보험료가 구분 표시됨 |
| 4 | 한화생명 blocker | 한화생명 표준체형/비흡연체형 0원 quote 원인 해소 | 공식 carrier quote 숫자 KRW 8건 확보 및 DB 적용 완료 |
| 5 | 신한라이프 blocker | 신한라이프 일반형 공식 문서 endpoint 추가 탐색 | 스크립트 기반 재탐색 완료. 일반형 endpoint 미발견으로 raw 차단 유지 |
| 6 | 보험상품 확장 | 남은 `needs_review=2`, `raw=11` source의 문서 hash, 매칭 키워드, caveat 정리 | 신한라이프 해약환급금 미지급형 매칭 검수 완료. raw 10개 문서 probe 대기 |
| 7 | 추천 snapshot 확대 | 새 source를 `approved`로 승격하고 `insurance_products` snapshot 발행 | 신한라이프 1건 DB apply 완료. 운영 active 추천 10건 |
| 8 | 상담 AI 상품 설명 | The Secret Keeper에 추천상품 목록, 보험료, 출처, caveat context 전달 | 구현 완료. 사용자가 KDB/교보/한화/DB/KB/현대해상 상품을 물으면 DB-selected 추천상품 기준으로 설명 |

2026-05-30 23:42 KST 기준 1번 Test Pilot UX 항목을 코드에 반영했다. guest session dashboard 상품 버튼은 `테스트 신청하기`를 표시하고, 일반 지갑 세션은 기존 `결제하기` 문구를 유지한다. 다음 작업은 flag off 상태의 운영 지갑/결제 회귀 검증이다.

2026-05-30 23:58 KST 기준 2번 Test Pilot 회귀 자동 검증을 완료했다. Local flag off 환경에서 Playwright E2E 21/21, `npm run build`, `npx tsc --noEmit --incremental false`가 통과했고, 홈 화면의 `테스트로 시작` visible CTA는 0개로 확인했다. 실제 NEAR/ETH 지갑 서명 checkout은 브라우저 지갑과 testnet 잔액이 필요한 수동 E2E 항목으로 유지한다. 다음 구현 작업은 3번 보험료 개인화, 즉 사용자 나이/성별 입력값과 approved quote matrix 연결이다.

2026-05-31 00:17 KST 기준 3번 보험료 개인화 1차 구현을 완료했다. Dashboard 추천 영역은 approved quote matrix에서 사용 가능한 나이/성별 조건을 추출해 사용자가 선택할 수 있게 하고, 추천 카드별로 선택 조건과 일치하는 `insurance_premium_quotes.review_status='approved'` row를 `내 조건 예상 보험료`로 강조 표시한다. 대표 보험료와 checkout 합계는 아직 snapshot 대표가를 유지하며, 결제 금액 개인화는 별도 정책 결정 후 진행한다. 검증은 `../05_QA_Validation/41_PREMIUM_QUOTE_PERSONALIZATION_2026_05_31.md`에 기록한다. 다음 작업은 한화생명 0원 quote 해소와 신한라이프 일반형 문서 endpoint 탐색, 그리고 추천 snapshot 상품 수 확대다.

2026-05-31 00:49 KST 기준 4번 한화생명 0원 quote blocker를 공식 carrier quote probe로 1차 해소했다. 한화생명 공식 상품 페이지 `CMS00012`와 계산 API 기준 상품 버전 55, 기준일 20260529를 확인했고, 100세 만기, 20년납, 월납, 주계약가입금액 1,000만원 조건으로 표준체형/비흡연체형 34세·44세 남녀 총 8개 숫자 KRW quote를 확보했다. 공식 페이지 예시 40세 남성/여성 표준체형과 계산 API 결과도 일치한다. 이번 단계는 DB write 없이 스크립트와 산출물만 추가했으며, 검증은 `../05_QA_Validation/42_HANWHA_LIFE_ZERO_QUOTE_BLOCKER_PROBE_2026_05_31.md`에 기록한다. 다음 작업은 한화생명 carrier quote를 seed/DB에 반영해 source-backed 추천 snapshot을 3개에서 5개로 확대하거나, 병렬로 신한라이프 일반형 blocker를 계속 탐색하는 것이다.

2026-05-31 01:09 KST 기준 7번 추천 snapshot 확대의 seed 준비를 한화생명 2개 source에 대해 완료했다. `seed.ts`는 적용 시 한화생명 표준체형/비흡연체형 source를 `approved`로 승격하고, 공식 carrier quote 8건을 삽입/승인하며, 기존 보험다모아 `0원` quote 8건을 `rejected`로 내리고, `insurance_products` snapshot 2건을 추가한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 검증은 `../05_QA_Validation/43_HANWHA_RECOMMENDATION_SNAPSHOT_SEED_2026_05_31.md`에 기록한다. 다음 작업은 운영 DB 백업 후 seed 적용과 적용 결과 검증이다. 적용 완료 후 source-backed active 추천 상품은 KDB 1건, 교보라이프플래닛 2건, 한화생명 2건으로 총 5건이 된다.

2026-05-31 01:37 KST 기준 한화생명 추천 snapshot 운영 DB 적용을 완료했다. 백업 후 `src/lib/db/seed.ts`를 실행해 한화생명 표준체형/비흡연체형 source 2건을 `approved`로 승격하고, 공식 carrier quote 8건을 삽입/승인했으며, `insurance_products` snapshot 2건을 추가했다. 운영 DB 기준 source-backed active 추천 상품은 KDB 1건, 교보라이프플래닛 2건, 한화생명 2건으로 총 5건이다. 단, 기존 보험다모아 `0원` quote는 seed target 8개 ID 중 운영 DB에 실제 존재하던 4건만 `rejected` 처리됐다. 이전 quote row 적용 단계에서 semantic duplicate skip으로 표준체형 4건이 DB에 없었기 때문에 나머지 4건 update는 no-op이었다. 적용 검증은 `../05_QA_Validation/44_HANWHA_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_31.md`에 기록한다. 다음 작업은 신한라이프 일반형 공식 문서 endpoint 탐색과 `needs_review=6`, `raw=11` source의 추천 후보 정리다.

2026-05-31 02:05 KST 기준 5번 신한라이프 blocker 재탐색을 완료했다. 전용 스크립트 `scripts/insurance/probe-shinhan-standard-documents.mjs`로 신한라이프 공식 `wcms` endpoint를 active/historical keyword와 full catalog 방식으로 재조회했고, active 134 row와 historical 1,775 row를 확인했다. target `신한SOL암보험` row는 해약환급금 미지급형 1건뿐이며, 보험다모아 표준형 source `L11C009000007`에 연결할 일반형 문서 endpoint는 여전히 발견되지 않았다. 따라서 `src_shinhan_life_sol_cancer_standard_202605`는 계속 `raw` 차단 상태로 둔다. 검증은 `../05_QA_Validation/45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md`에 기록한다. 다음 작업은 6번 보험상품 확장, 즉 `needs_review=6`, `raw=11` source 중 공식 문서와 보험료 근거가 명확한 상품의 매칭 키워드와 caveat 정리다.

2026-05-31 02:20 KST 기준 6번 보험상품 확장의 첫 묶음으로 실손의료보험 baseline 후보 4개를 검수했다. DB손보, KB손보, 현대해상은 공식 문서 match score 1.0과 조건별 숫자 KRW quote 4건씩이 있어 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`로 다음 baseline 추천 snapshot seed 후보가 된다. 삼성화재는 quote는 있으나 문서 URL이 generic `realloss.pdf`이고 match score가 0.65라 상품 전용 문서 endpoint 재탐색 전까지 보류한다. 검증은 `../05_QA_Validation/46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md`에 기록한다. 다음 작업은 DB손보, KB손보, 현대해상 3개 source를 `approved`로 승격하고 quote 12건을 승인한 뒤 baseline `insurance_products` snapshot 3건을 준비하는 seed PR이다.

2026-05-31 02:49 KST 기준 7번 추천 snapshot 확대의 실손 baseline seed 준비를 완료했다. `seed.ts`는 적용 시 DB손보, KB손보, 현대해상 source 3건을 `approved`로 승격하고, 보험다모아 실손 quote 12건을 `approved`로 바꾸며, baseline `insurance_products` snapshot 3건을 추가한다. 대표 보험료는 `age34_female` 조건이고, `monthly_premium_usdc`는 고정 데모 환산율 `1 USDC = 1,350 KRW`로 계산한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 검증은 `../05_QA_Validation/47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 기록한다. 다음 작업은 운영 DB 백업 후 seed 적용과 적용 결과 검증이다. 적용 완료 후 source-backed active 추천 상품은 KDB 1건, 교보라이프플래닛 2건, 한화생명 2건, 실손 baseline 3건으로 총 8건이 된다.

2026-05-31 03:20 KST 기준 실손 baseline 추천 snapshot 운영 DB 적용을 완료했다. 백업 후 `src/lib/db/seed.ts`를 실행해 DB손보, KB손보, 현대해상 source 3건을 `approved`로 승격하고, baseline `insurance_products` snapshot 3건을 추가했다. 운영 DB 기준 source-backed active 추천 상품은 KDB 1건, 교보라이프플래닛 2건, 한화생명 2건, 실손 baseline 3건으로 총 8건이다. 단, seed target quote 12건 중 당시 target ID로 매칭된 row는 여성 조건 6건뿐이어서 `insurance_premium_quotes.review_status=approved`는 20건에서 26건으로 증가했다. 당시 남성 조건 6건은 no-op으로 기록했다. 검증은 `../05_QA_Validation/48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md`에 기록한다.

2026-05-31 03:58 KST 기준 후속 읽기 전용 확인에서 실손 baseline 남성 quote 6건은 운영 DB에 존재하지만 다른 `quote_hash_sha256` suffix ID로 저장되어 있음을 확인했다. 따라서 재적재가 아니라 `MEDICAL_BASELINE_APPROVED_QUOTE_IDS`를 actual DB ID로 교정하는 것이 맞다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 후속 apply 후 `insurance_premium_quotes.review_status=approved`는 26건에서 32건으로 증가해야 한다. 검증은 `../05_QA_Validation/49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md`에 기록한다. 다음 작업은 운영 DB 백업 후 seed 재실행으로 교정된 남성 quote 6건을 승인하고, 삼성화재 상품 전용 문서 endpoint를 재탐색하는 것이다.

2026-05-31 04:49 KST 기준 실손 baseline 남성 quote approval ID 교정을 운영 DB에 백업 후 적용했다. seed 재실행 후 실손 baseline target quote 12건은 모두 `approved` 상태이며, 전체 `insurance_premium_quotes.review_status=approved`는 26건에서 32건으로 증가했다. `insurance_products=13`, source-backed active 추천 상품 8건은 변하지 않았다. 검증은 `../05_QA_Validation/50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md`에 기록한다. 다음 작업은 사용자 조건별 보험료 UI에서 남성 조건 표시를 확인하고, 삼성화재 상품 전용 문서 endpoint를 재탐색하는 것이다.

2026-05-31 11:50 KST 기준 로컬 임시 DB와 로컬 Dashboard에서 실손 baseline 남성 조건 UI 표시를 검증했다. `추천 보험 (3)` 탭에서 남성 34세 선택 시 DB손보 6,219 KRW, KB손보 6,400 KRW, 현대해상 6,740 KRW가 `내 조건 예상 보험료`로 표시됐고, 남성 44세 선택 시 DB손보 9,320 KRW, KB손보 9,074 KRW, 현대해상 9,190 KRW가 표시됐다. `선택한 조건의 승인 보험료가 아직 없습니다.` fallback은 표시되지 않았다. 검증은 `../05_QA_Validation/51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md`에 기록한다. 다음 작업은 삼성화재 실손의료보험 상품 전용 문서 endpoint 재탐색과 남은 raw/needs_review source 정리다.

2026-05-31 13:46 KST 기준 상담 AI가 추천상품을 DB 근거로 설명할 수 있도록 The Secret Keeper 추천상품 컨텍스트 주입 설계를 추가했다. 현재 채팅 경로는 `riskProfile`만 전달하므로, 다음 구현 PR에서는 `DashboardData.products`의 추천상품 목록, 대표/조건별 보험료, 공식 출처, caveat를 요약해 `chatWithConcierge`에 전달한다. 상담 AI는 새 상품을 생성하지 않고 현재 추천 결과에 포함된 DB-selected 상품만 설명한다. 설계 문서는 `../03_Technical_Specs/05_CONCIERGE_PRODUCT_CONTEXT_SPEC_2026_05_31.md`에 둔다. 다음 작업은 이 설계에 따라 `ConciergeProductContext`를 코드에 연결하는 구현 PR이다.

2026-05-31 14:12 KST 기준 8번 상담 AI 상품 설명 구현을 완료했다. `DashboardClient`는 현재 추천 화면의 source-backed active 상품과 선택된 나이/성별 조건을 `ConciergeProductContext`로 축약하고, `ConciergeChat`은 이를 `chatWithConcierge`에 전달한다. 서버 액션은 Zod schema로 상품 컨텍스트를 검증하며, `buildSystemPrompt`는 대표 보험료, 선택 조건 보험료, approved quote 요약, 공식 출처, caveat와 목록 밖 상품 생성 금지 guardrail을 포함한다. 검증은 `../05_QA_Validation/52_CONCIERGE_PRODUCT_CONTEXT_QA_2026_05_31.md`에 기록한다. 다음 작업은 실제 Test Pilot Dashboard에서 KDB, 한화, 교보, DB손보, KB손보, 현대해상 상품 질문을 NEAR AI 응답 기준으로 수동 검증하고, 삼성화재 상품 전용 문서 endpoint 재탐색과 남은 raw/needs_review source 정리를 이어가는 것이다.

2026-05-31 16:14 KST 기준 삼성화재 실손의료보험 상품 전용 문서 endpoint 재탐색을 완료했다. `scripts/insurance/probe-samsung-fire-medical-documents.mjs`는 삼성화재 직접 상품 상세 페이지와 `realloss.pdf` 약관을 조회하고, 직접 상품 페이지의 상품명/상품약관/2026년 5월 5세대 실손 근거와 PDF 텍스트의 `2605.1`/일반형 조항을 확인했다. 기존 PDF hash `db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415`와도 일치한다. 검증은 `../05_QA_Validation/53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md`에 기록한다. 다음 작업은 삼성화재 source approved, quote 4건 approved, baseline `insurance_products` snapshot 1건을 준비하는 seed PR이다. 적용 후 운영 source-backed active 추천 상품은 8건에서 9건이 된다.

2026-05-31 16:42 KST 기준 삼성화재 실손 baseline 추천 snapshot seed 준비를 완료했다. `seed.ts`는 적용 시 삼성화재 source 1건을 `approved`로 승격하고, 운영 DB 읽기 전용 확인으로 확정한 quote 4건을 `approved`로 바꾸며, `prod_samsung_fire_direct_medical_202605` snapshot 1건을 추가한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 검증은 `../05_QA_Validation/54_SAMSUNG_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 기록한다. 다음 작업은 운영 DB 백업 후 seed apply PR이다. 적용 후 운영 source-backed active 추천 상품은 8건에서 9건이 된다.

2026-05-31 17:26 KST 기준 삼성화재 실손 baseline 추천 snapshot을 운영 DB에 백업 후 적용했다. 적용 후 `insurance_products=14`, source-backed active 추천 상품은 8건에서 9건으로 늘었고, `insurance_product_sources.review_status=approved`는 9건, `insurance_premium_quotes.review_status=approved`는 32건에서 36건으로 증가했다. 삼성화재 source 1건, quote 4건, product snapshot 1건이 모두 approved/active 상태다. 검증은 `../05_QA_Validation/55_SAMSUNG_FIRE_BASELINE_DB_APPLY_2026_05_31.md`에 기록한다. 다음 작업은 남은 raw/needs_review source 13개의 공식 문서, 매칭 키워드, caveat 정리와 아직 source 후보로 구조화하지 못한 보험다모아 P0 샘플 34개 처리다.

2026-05-31 17:57 KST 기준 운영 DB를 읽기 전용으로 확인해 남은 non-approved source 13개의 처리 순서를 정리했다. `needs_review` 2개 중 신한라이프 해약환급금 미지급형은 공식 문서 3건과 quote 4건이 있어 다음 매칭 키워드/caveat 검수 후보이고, 삼성생명 입원 건강보험은 현재 enum에 맞는 `coverage_category` 정책 결정이 먼저다. `raw` 11개 중 10개는 공식 문서 hash가 없어 보험사별 probe가 먼저이며, 신한라이프 표준형은 일반형 문서 endpoint가 발견될 때까지 차단한다. 산출물은 `../../data/insurance/latest_remaining_source_candidate_triage.json`, `../../data/insurance/latest_remaining_source_candidate_triage.csv`, 검증은 `../05_QA_Validation/56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md`에 기록한다. 다음 작업은 신한라이프 해약환급금 미지급형 암보험 매칭 검수 또는 raw source 공식 문서 probe 묶음이다.

2026-05-31 18:09 KST 기준 신한라이프 `src_shinhan_life_sol_cancer_202601` 해약환급금 미지급형 암보험의 공식 PDF 3건을 재다운로드해 SHA-256 일치를 확인하고, 매칭 키워드와 caveat를 정리했다. 이 source는 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 다음 추천 snapshot seed 후보가 된다. 단, 아직 DB write는 없고 source/quote/product snapshot 승격은 별도 seed PR에서 진행한다. 산출물은 `../../data/insurance/latest_shinhan_no_refund_matching_review.json`, `../../data/insurance/latest_shinhan_no_refund_matching_review.csv`, 검증은 `../05_QA_Validation/57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md`에 기록한다. 다음 작업은 신한라이프 source approval, quote 4건 approval, active product snapshot 1건을 준비하는 seed PR이다.

2026-05-31 18:23 KST 기준 신한라이프 해약환급금 미지급형 source approval, quote 4건 approval, `prod_shinhan_life_sol_cancer_no_refund_202601` active product snapshot 1건을 `seed.ts`에 준비했다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 적용 후 운영 DB 기준 source-backed active 추천 상품은 9건에서 10건, approved quote는 36건에서 40건으로 늘어야 한다. 산출물은 `../../data/insurance/latest_shinhan_no_refund_snapshot_seed.json`, 검증은 `../05_QA_Validation/58_SHINHAN_NO_REFUND_SNAPSHOT_SEED_2026_05_31.md`에 기록한다. 다음 작업은 운영 DB 백업 후 seed 적용과 적용 결과 검증이다.

2026-05-31 18:51 KST 기준 신한라이프 해약환급금 미지급형 추천 snapshot을 운영 DB에 백업 후 적용했다. 적용 후 `insurance_products=15`, source-backed active 추천 상품은 9건에서 10건으로 늘었고, `insurance_product_sources.review_status=approved`는 10건, `insurance_premium_quotes.review_status=approved`는 36건에서 40건으로 증가했다. 신한라이프 source 1건, quote 4건, product snapshot 1건이 모두 approved/active 상태다. 검증은 `../05_QA_Validation/59_SHINHAN_NO_REFUND_DB_APPLY_2026_05_31.md`에 기록한다. 다음 작업은 Test Pilot Dashboard에서 신한라이프 카드와 상담 AI 설명을 수동 확인하거나, raw source 10개 공식 문서 probe 묶음을 진행하는 것이다.

2026-05-31 19:10 KST 기준 raw source 10개의 공식 상품 페이지와 carrier disclosure probe를 실행했다. 공식 상품 URL이 있는 7개는 상품 페이지 접근이 가능했지만 PDF hash는 0건이며, 롯데손보 실손, 한화손보 실손, 동양생명 암보험 3개는 source snapshot에 공식 상품 URL이 없어 probe에서 제외됐다. carrier disclosure profile은 DB생명 1개만 실행됐고 match score 0.3333으로 threshold 미달이다. 검증은 `../05_QA_Validation/60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md`에 기록한다. 다음 작업은 농협손보 실손의료보험 공시 adapter를 먼저 보강하고, 이어서 메리츠화재, 흥국화재, 미래에셋생명, 한화손보 adapter와 공식 URL 미확보 3개 재탐색을 진행하는 것이다.

2026-05-31 19:26 KST 기준 농협손보 실손의료보험 공시 adapter를 보강했다. 상품 페이지의 `fnPdtFileDownload` 호출에서 `fileId=F004074317`, `afileSeqn=1`을 추출해 공식 약관 PDF를 다운로드했고, SHA-256 `0306fb42f84fa976ff9680aadf6a1b348e87d5c99cd503e85b1e82b9bf728048`, 3,065,859 bytes를 확인했다. 이번 단계는 DB write 없이 crawler/data/docs만 변경했으며, 검증은 `../05_QA_Validation/61_NH_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md`에 기록한다.

2026-05-31 19:33 KST 기준 농협손보 실손의료보험 매칭 키워드/caveat 정리를 완료했다. 공식 약관 hash 1건과 보험다모아 조건별 숫자 quote 4건이 있으므로 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` baseline snapshot 후보가 될 수 있다. 단, 공식 약관 파일명에 `전환계약용`이 포함되므로 seed PR에서 이 caveat를 유지한다. 이번 단계는 DB write 없이 data/docs만 추가했으며 추천 snapshot 수는 10개로 유지한다. 검증은 `../05_QA_Validation/62_NH_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md`에 기록한다. 다음 작업은 농협손보 source document seed 후보 추가, source/quote approval, baseline `insurance_products` snapshot seed PR이다. 적용 완료 후 source-backed active 추천 상품은 10개에서 11개로 늘어난다.

적용 준비 문서는 `03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md`를 기준으로 관리한다.
보험상품 공식 출처 수집 PoC 결과는 `../05_QA_Validation/04_INSURANCE_DATA_ACQUISITION_POC_2026_05_27.md`와 `../../data/insurance/official_sources_poc_2026_05_27.json`에 기록한다. 반복 실행용 Collector v1 최신 결과는 `../../data/insurance/latest_official_sources_snapshot.json`에 두고, 대표 상품 공식 문서 probe 결과는 `../../data/insurance/latest_product_document_probe.json`에 둔다. 보험사 공시실 crawler v1 결과는 `../../data/insurance/latest_carrier_disclosure_probe.json`과 `../05_QA_Validation/06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md`에 둔다. 매칭 키워드 정리 CSV v1은 `../../data/insurance/latest_insurance_review_queue.csv`와 `../05_QA_Validation/07_INSURANCE_REVIEW_QUEUE_2026_05_27.md`에 둔다.
hash-backed 7개 상품 매칭 키워드 정리 결과는 `../../data/insurance/latest_seed_candidate_review.json`, `../../data/insurance/latest_seed_candidate_review.csv`, `../05_QA_Validation/08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md`에 둔다. 결론상 현재 `insurance_products` seed에 바로 넣을 만큼 매칭 키워드가 정리된 실제 상품은 없고, 암보험 2개는 `catalog_candidate`, 실손의료보험 4개는 `baseline_candidate`, 삼성생명 입원 건강보험 1개는 `schema_extension_required`로 관리한다.
스키마 확장안은 `../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md`에 확정했고, Drizzle/Zod schema, `drizzle/0004_panoramic_firebird.sql`, `drizzle/0005_common_boom_boom.sql`, `matchProducts`의 `risk_target`/`baseline` 분리, 추천 카드의 baseline/출처/보험료 기준/caveat 표시, Turso DB migration 적용까지 완료했다. 적용 검증은 `../05_QA_Validation/09_DB_MIGRATION_0004_0005_2026_05_28.md`에 기록한다. 이후 삼성생명, 현대해상, 신한라이프, KB손보 공시/상품 API adapter를 추가해 공시실 PDF hash 확보 문서를 10개로 늘렸다. 조건별 보험료는 대표 `premium_text`와 분리해 `insurance_premium_quotes` table로 관리하며, 정책 문서는 `04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md`에 둔다.

2026-05-28 source-aware seed 정책 PR에서는 7개 보험사, 7개 hash-backed 매칭 정리 후보, 12개 PDF 원문 hash를 `seed.ts`의 `insurance_carriers`, `insurance_product_sources`, `insurance_source_documents` 입력으로 반영했다. 2026-05-28 10:43 KST 기준 Turso DB에도 백업 후 seed 적용을 완료했고, 적용 검증은 `../05_QA_Validation/11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md`에 기록한다. 2026-05-29 기준으로는 보험다모아 quote matrix에서 빠진 60개 quote row를 연결하기 위해 quote-only raw source 후보 15개와 신규 carrier 10개를 seed 입력에 추가했고, 백업 후 Turso DB 적용까지 완료했다. 이후 한화생명 비흡연체형과 교보라이프플래닛 비흡연체/표준체의 안전 후보 문서 8건도 백업 후 DB에 적용했다. DB 기준 `insurance_carriers=17`, `insurance_product_sources=22`, `insurance_source_documents=20`이며, 신규 15개 source는 공식 문서 hash와 매칭 키워드 정리 전이므로 `review_status=raw`이고 추천 상품으로 발행하지 않는다. 매칭 키워드 정리 정책은 `../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md`, seed 정책 검증은 `../05_QA_Validation/10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md`, quote-only 확장 검증은 `../05_QA_Validation/18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md`, DB 적용 검증은 `../05_QA_Validation/19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md`와 `../05_QA_Validation/24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md`에 기록한다.

2026-05-28 보험료 quote matrix PoC에서는 보험다모아 모바일 출처로 8개 source probe와 66개 quote row를 재조회했다. 암보험은 34세/44세 남성/여성 조건이 모두 조회됐고, 실손의료보험은 남성 34세/44세 조건에서 DB손보, KB손보, 삼성화재, 현대해상 상품의 보험료 변동이 확인됐다. 이후 실손의료보험 여성 조건은 모바일 폼 기준 성별 코드가 `F`가 아니라 `L`임을 확인해 HTTP 500을 해소했다. 최신 probe는 8개 source 모두 HTTP 200, 84개 raw quote row를 생성하며, 2026-05-29 기준 84건 전부 `insurance_premium_quotes.review_status=needs_review` 상태로 Turso DB에 적재했다. 검증 결과는 `../05_QA_Validation/12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md`, `../05_QA_Validation/13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md`, `../05_QA_Validation/14_PREMIUM_QUOTES_DB_APPLY_2026_05_28.md`, `../05_QA_Validation/15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md`, `../05_QA_Validation/17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md`, `../05_QA_Validation/18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md`, `../05_QA_Validation/19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md`에 기록한다. 다음 작업은 quote-only raw source 15개의 공식 문서 hash 확보와 매칭 키워드 정리다.

2026-05-29 01:55 KST 기준 quote-only raw source 15개에 대해 product-code 기반 공식 상품 페이지 probe를 수행했다. 15개 중 12개는 공식 상품 URL이 있었고, 상품 페이지 직접 probe로 한화생명 비흡연체형과 KDB생명 다이렉트 암보험에서 5개 PDF hash를 확보했다. 기존 carrier disclosure crawler를 연결하면 신한라이프 표준형 후보에서 3개 hash가 추가로 나오지만 match score 0.5라 variant 확인이 필요하다. 결과는 `../../data/insurance/latest_quote_only_product_document_probe.json`, `../../data/insurance/latest_quote_only_carrier_disclosure_probe.json`, `../05_QA_Validation/20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md`에 기록한다.

2026-05-29 02:26 KST 기준 교보라이프플래닛 공시실 `HPDA01S0` adapter를 추가했다. 교보라플 비갱신암보험 quote-only 후보 2개(`L43C009000022`, `L43C009000019`)가 match score 1.0으로 상품요약서, 사업방법서, 보험약관 hash를 확보했고, carrier disclosure probe의 hashed document는 3개에서 9개로 늘었다. 전체 quote-only 공식 문서 근거는 상품 페이지 hash 5개와 carrier disclosure hash 9개다. 검증은 `../05_QA_Validation/21_LIFEPLANET_DISCLOSURE_ADAPTER_2026_05_29.md`에 기록한다.

2026-05-29 02:58 KST 기준 quote-only hash-backed 후보의 상품 variant를 검수했다. 한화생명 비흡연체형 1개 source와 교보라이프플래닛 비흡연체/표준체 2개 source는 총 8개 `insurance_source_documents` seed 후보로 분리 가능하다. KDB생명은 40869/40870 약관 variant가 미확정이라 차단하고, 신한라이프 표준형 source는 해약환급금 미지급형 문서가 match score 0.5로 연결되어 차단한다. 검수 산출물은 `../../data/insurance/latest_quote_only_source_document_variant_review.json`, `../../data/insurance/latest_quote_only_source_document_variant_review.csv`, `../05_QA_Validation/22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md`에 둔다.

2026-05-29 03:24 KST 기준 안전 후보 8개 `insurance_source_documents` row를 `seed.ts`에 추가했다. 한화생명 표준체형/비흡연체형과 교보라이프플래닛 비흡연체/표준체는 같은 PDF hash를 공유할 수 있으므로, `file_hash_sha256` 중복은 허용하고 source별 고유 `id`와 `product_source_id`로 연결한다. seed 기준 문서 row는 12개에서 20개로 증가하지만, `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않는다. 검증은 `../05_QA_Validation/23_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_29.md`에 둔다.

2026-05-29 14:23 KST 기준 위 8개 source document row를 운영 Turso DB에 백업 후 적용했다. 적용 후 DB는 `insurance_source_documents=20`, 신규 문서 row 8건 존재, invalid hash 0건, `insurance_product_sources.review_status` 분포 `needs_review=7`/`raw=15`를 확인했다. 적용 기록은 `../05_QA_Validation/24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md`에 둔다.

2026-05-29 23:11 KST 기준 KDB생명 `40869/40870` 약관 variant와 신한라이프 표준형/해약환급금 미지급형 문서 관계를 재검수했다. KDB생명 `src_kdb_life_direct_cancer_202605`는 `40869_summary`와 `40870_policy` 2건을 다음 seed 후보로 확정할 수 있고, `40869_policy`는 갱신형 약관이라 제외한다. 신한라이프 `src_shinhan_life_sol_cancer_standard_202605`는 현재 확보 문서 3건이 모두 해약환급금 미지급형이므로 표준형 source에는 연결하지 않는다. 검수 산출물은 `../../data/insurance/latest_kdb_shinhan_variant_resolution.json`, `../../data/insurance/latest_kdb_shinhan_variant_resolution.csv`, `../05_QA_Validation/26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md`에 둔다. 다음 작업은 KDB source document 2건 seed 후보 추가와 신한라이프 일반형 공식 문서 endpoint 탐색이다. 그 다음 raw/needs_review source의 매칭 키워드와 caveat를 정리한다.

2026-05-30 00:11 KST 기준 KDB생명 source document 2건을 `seed.ts` 후보로 추가했다. seed 기준 `insurance_source_documents` 입력은 20개에서 22개로 증가하지만, `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않는다. 검증은 `../05_QA_Validation/27_KDB_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_30.md`에 둔다. 다음 작업은 운영 DB 백업 후 KDB 문서 2건을 적용하는 apply PR과 신한라이프 일반형 공식 문서 endpoint 탐색이다.

2026-05-30 03:06 KST 기준 KDB생명 source document 2건을 운영 Turso DB에 백업 후 적용했다. 적용 후 DB는 `insurance_source_documents=22`, KDB 신규 문서 row 2건 존재, invalid hash 0건, 제외한 `40869_policy` 갱신형 hash row 0건, `insurance_product_sources.review_status` 분포 `needs_review=7`/`raw=15`를 확인했다. 적용 기록은 `../05_QA_Validation/28_KDB_SOURCE_DOCUMENTS_DB_APPLY_2026_05_30.md`에 둔다. 다음 작업은 신한라이프 일반형 공식 문서 endpoint 탐색과 raw/needs_review source의 매칭 키워드, caveat 정리다.

2026-05-30 13:52 KST 기준 추천 snapshot 발행 기준을 [보험상품 매칭 키워드 정리 정책](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) 7절에 명시했다. 앞으로 source 후보를 사용자 추천에 노출하려면 원천 근거, 매칭 필드, 대표/조건별 보험료, `insurance_products` snapshot row, PR 검증 항목을 모두 통과해야 한다. 이는 실제 보험상품 수집 완료와 사용자 추천 노출 사이의 마지막 관문이다.

2026-05-30 14:08 KST 기준 신한라이프 `L11C009000007` 일반형 공식 문서 endpoint를 추가 탐색했다. 신한라이프 공식 공시 `wcms` endpoint의 exact keyword, 표준형 keyword, 판매중 전체 112 row, 과거 포함 sample 1200 row를 확인했지만 `신한SOL암보험(무배당)(비갱신형)` 일반형 문서 row는 찾지 못했다. 현재 판매중 row는 해약환급금 미지급형 1건뿐이므로 `src_shinhan_life_sol_cancer_standard_202605`는 계속 `raw` 차단 상태로 유지한다. 검증은 `../05_QA_Validation/29_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_PROBE_2026_05_30.md`에 둔다. 다음 작업은 공식 문서 variant가 명확한 KDB, 한화생명, 교보라이프플래닛 후보부터 매칭 키워드와 caveat를 정리하는 것이다.

2026-05-31 02:05 KST 기준 위 신한라이프 endpoint 탐색을 전용 스크립트로 재실행했다. 조회 범위는 active 134 row와 historical 1,775 row로 확대했지만 결론은 동일하다. 최신 검증은 `../05_QA_Validation/45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md`를 우선한다.

2026-05-30 14:41 KST 기준 KDB생명, 한화생명, 교보라이프플래닛 암보험 후보 5개 source의 매칭 키워드와 caveat를 정리했다. 5개 모두 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 매칭 가능하다. 다만 한화생명 표준체형/비흡연체형 2개 source는 quote row가 모두 `0원`이라 첫 active 추천 snapshot에서는 제외한다. KDB생명 1개와 교보라이프플래닛 2개 source는 숫자 KRW quote가 있어 다음 추천 snapshot seed PR의 우선 후보로 둔다. 검증은 `../05_QA_Validation/30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md`, 산출물은 `../../data/insurance/latest_matching_keyword_caveat_review.json`과 `../../data/insurance/latest_matching_keyword_caveat_review.csv`에 둔다. 다음 작업은 KDB/교보 3개 source의 source status 승격, quote 승인, `insurance_products` snapshot row 생성을 묶은 seed PR이다.

2026-05-30 16:30 KST 기준 KDB생명 1개와 교보라이프플래닛 2개 source를 첫 source-backed active 추천 snapshot으로 발행할 seed 변경을 준비했다. `seed.ts`는 적용 시 source 3건을 `approved`로 승격하고, quote row 12건을 `approved`로 바꾸며, `insurance_products` snapshot row 3건을 추가한다. 대표 보험료는 보험다모아 `age34_female` 조건이고, `monthly_premium_usdc`는 고정 데모 환산율 `1 USDC = 1,350 KRW`로 계산한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 운영 반영은 백업 후 apply PR로 분리한다. 검증은 `../05_QA_Validation/31_FIRST_RECOMMENDATION_SNAPSHOT_SEED_2026_05_30.md`, 산출물은 `../../data/insurance/latest_first_recommendation_snapshot_seed.json`에 둔다. 다음 작업은 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts` 실행과 적용 결과 검증이다.

2026-05-30 15:31 KST 기준 첫 source-backed active 추천 snapshot seed를 운영 Turso DB에 백업 후 적용했다. 적용 후 `insurance_products=8`, source-backed active product 3건, `insurance_product_sources.review_status` 분포 `approved=3`/`needs_review=7`/`raw=12`, `insurance_premium_quotes.review_status` 분포 `approved=12`/`needs_review=72`를 확인했다. 검증은 `../05_QA_Validation/32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md`에 둔다. 다음 작업은 추천 카드에서 대표 보험료와 조건별 approved quote matrix를 분리 표시하고, 기존 demo 상품 5건을 계속 노출할지 source-backed 상품만 노출할지 정책을 정하는 것이다.

2026-05-30 15:46 KST 기준 운영 추천 경로는 source-backed 상품만 사용하도록 전환한다. `matchProducts`, dashboard, cart 경로는 `is_active=1`, `catalog_status=approved`, `product_source_id IS NOT NULL` 조건을 통과한 상품만 읽는다. `seed.ts`는 fresh DB에 legacy demo 상품을 더 이상 넣지 않고, 다음 운영 seed 적용 시 `prod_001`~`prod_005`를 `archived`로 내린다. 이번 단계는 DB write 없이 코드와 문서만 변경하며, 운영 반영은 백업 후 apply PR로 분리한다. 검증은 `../05_QA_Validation/33_DEMO_INSURANCE_PRODUCTS_RETIREMENT_2026_05_30.md`에 둔다. 다음 작업은 운영 DB 백업 후 seed 적용으로 legacy demo active 상품 0건을 확인하고, 추천 카드에서 대표 보험료와 조건별 approved quote matrix를 분리 표시하는 것이다.

2026-05-30 16:26 KST 기준 운영 Turso DB에 legacy demo 상품 archive를 백업 후 적용했다. 적용 후 `prod_001`~`prod_005`는 모두 `catalog_status=archived`, `is_active=0`이고, active product total은 source-backed 상품 3건만 남았다. `insurance_product_sources.review_status` 분포는 `approved=3`/`needs_review=7`/`raw=12`, `insurance_premium_quotes.review_status` 분포는 `approved=12`/`needs_review=72`로 유지됐다. 검증은 `../05_QA_Validation/34_DEMO_PRODUCTS_ARCHIVE_DB_APPLY_2026_05_30.md`에 둔다. 다음 작업은 추천 카드 UI에서 대표 보험료와 조건별 approved quote matrix를 분리 표시하는 것이다.

2026-05-30 16:40 KST 기준 추천 카드 UI에서 대표 보험료와 조건별 approved quote matrix를 분리 표시했다. `getDashboardData`는 active source-backed 상품의 `product_source_id` 기준으로 `insurance_premium_quotes.review_status='approved'` row만 조회해 카드에 연결하고, `InsuranceProductCard`는 대표 KRW 보험료, USDC 환산값, 조건별 예상 보험료, 공식 비교 조건 caveat를 구분해서 표시한다. `needs_review` quote 72건은 UI에 노출하지 않는다. 검증은 `../05_QA_Validation/35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md`에 둔다. 다음 작업은 사용자 나이/성별 입력값과 approved quote matrix를 연결하는 개인화 선택 로직을 설계하고, 한화생명 0원 quote와 신한라이프 일반형 문서 endpoint를 계속 해소하는 것이다.

2026-05-30 17:18 KST 기준 서비스 테스트 기간을 위한 Test Pilot Mode 정책을 문서화했다. 테스트 사용자는 사인업, 로그인, NEAR 지갑 연결 없이 `guest-*.testnet` identity로 업로드와 분석을 진행하고, 실제 결제 없이 `테스트 신청 완료`까지 갈 수 있어야 한다. 운영 결제·지갑 플로우는 유지하되 feature flag로 분기하고, test checkout은 실제 `transactions` row와 혼동되지 않도록 별도 `test_pilot_checkouts` 모델을 권장한다. 기술 명세는 `../03_Technical_Specs/04_TEST_PILOT_MODE_SPEC_2026_05_30.md`, UI 흐름은 `../02_UI_Screens/USER_FLOW.md`, QA 체크리스트는 `../05_QA_Validation/36_TEST_PILOT_MODE_QA_2026_05_30.md`에 둔다. 다음 작업은 guest identity 생성, 지갑 없는 session 생성, test analysis action, no-payment checkout을 순차 구현하는 것이다.

2026-05-30 17:53 KST 기준 Test Pilot Mode 2단계로 `runTestPilotAnalysis` 서버 액션과 분석 화면의 guest session 분기를 구현했다. `guest-*.testnet` 분석 세션은 `TEST_PILOT_ENABLED=true` 및 `TEST_PILOT_SKIP_WALLET=true`일 때만 NEAR 서명 검증 없이 실행되고, TEE 분석·attestation·ZKP commitment·source-backed 상품 매칭·결과 저장은 운영 `runAnalysis`와 동일한 공통 경로를 사용한다. 브라우저 `sessionStorage`의 원본 파일은 분석 요청 직전에 제거한다. 다음 작업은 `test_pilot_checkouts` schema/migration과 no-payment checkout 완료 화면 구현이다.

2026-05-30 18:20 KST 기준 Test Pilot Mode 3단계로 `test_pilot_checkouts` Drizzle schema와 `drizzle/0007_silky_magma.sql` migration, `completeTestPilotCheckout` 서버 액션, checkout 화면의 no-payment 분기를 구현했다. `guest-*.testnet` cart는 `TEST_PILOT_ENABLED=true` 및 `TEST_PILOT_SKIP_PAYMENT=true`일 때만 실제 `transactions` row 생성 없이 test checkout row로 완료되고, 성공 화면은 tx hash 대신 Test Checkout ID를 표시한다. 운영 결제 NEAR/ETH 경로는 기존 `prepareCheckout`/`confirmCheckout` 경로를 유지한다. 다음 작업은 운영 DB 백업 후 0007 migration 적용과 Test Pilot E2E 검증이다.

2026-05-30 18:50 KST 기준 운영 Turso DB에 백업 후 `drizzle/0007_silky_magma.sql`을 적용했다. 적용 후 DB는 `test_pilot_checkouts` 테이블과 `test_pilot_checkouts_cart_id_unique`, `test_pilot_checkouts_wallet_idx` 인덱스를 보유하며, 신규 row는 0건이다. 기존 핵심 row count는 유지됐고 `__drizzle_migrations`는 7건에서 8건으로 증가했다. 적용 검증은 `../05_QA_Validation/38_TEST_PILOT_0007_DB_APPLY_2026_05_30.md`에 둔다. 다음 작업은 Test Pilot 환경변수를 켠 상태에서 업로드 -> 분석 -> 추천 -> 무결제 테스트 신청 완료 E2E를 수행하는 것이다.

2026-05-30 19:23 KST 기준 Test Pilot Mode E2E를 완료했다. `TEST_PILOT_ENABLED=true`, `NEXT_PUBLIC_TEST_PILOT_ENABLED=true`, `TEST_PILOT_SKIP_WALLET=true`, `TEST_PILOT_SKIP_PAYMENT=true` 환경에서 홈의 `테스트로 시작`부터 업로드, TEE 분석, source-backed 추천, checkout, `결제 없이 테스트 신청 완료`까지 완주했다. 운영 DB 검증 결과 `test_pilot_checkouts`는 0건에서 1건으로 증가했고, E2E cart는 `checked_out`으로 전환됐으며, 실제 결제 `transactions`는 45건으로 유지됐다. 검증은 `../05_QA_Validation/39_TEST_PILOT_E2E_2026_05_30.md`에 둔다. 다음 작업은 dashboard 상품 CTA를 guest session에서 `테스트 신청하기`로 다듬고, flag off 상태의 운영 지갑/결제 회귀 테스트를 수행하는 것이다.

## 2. 세부 실행 계획 (Detailed Execution)

| 단계 | 주요 태스크 | 기간 (예상) |
| :--- | :--- | :--- |
| **2026-04** | 해커톤 데모 완성 (Phase 0) — Next.js UI, Testnet 연동, IronClaw TEE + Intel TDX Attestation 완료 | 3주 |
| **Q2 2026** | MVP 에이전트 개발 및 DTC 데이터 해석 파이프라인 구축, 텔레그램 → 웹 전환 | 3개월 |
| **Q3 2026** | NEAR TEE(IronClaw) 환경 실제 연동 및 보안 감사 (외부 Audit) | 2개월 |
| **Q4 2026** | GA 라이선스 확보 또는 제휴 GA사 계약, 베타 서비스 운영 | 3개월 |
| **Q1 2027** | 글로벌 시장 진출 (싱가포르, 유럽 등), Chain Abstraction 멀티체인 통합, 토큰 이코노미 적용 | 지속 |

---

## 3. 팀 구성 및 역할 (Team & Responsibilities)

| 역할 | 담당 영역 |
| :--- | :--- |
| 프로덕트 리더 | 비즈니스 기획, VC 피칭, 보험사 파트너십, 규제 대응 |
| 풀스택 개발자 | Next.js DApp, Drizzle/Turso DB, Server Actions |
| 웹3 개발자 | NEAR 스마트 컨트랙트, Confidential Intents, Chain Signatures |
| AI/백엔드 개발자 | IronClaw TEE 분석 에이전트, ZKP 회로(Noir), 보험 매칭 엔진 |
| 디자이너 | Figma 시안, Shadcn/ui 커스터마이징, 애니메이션 스펙 |

> 해커톤 단계에서 역할이 중복될 경우 풀스택 개발자가 웹3 연동까지 겸임하고, AI 에이전트는 Mock으로 대체하여 데모 완성을 우선.

---

## 4. 기술 리스크 및 대응 계획 (Technical Risk Management)

| 리스크 | 심각도 | 가능성 | 대응 계획 |
| :--- | :--- | :--- | :--- |
| IronClaw TEE 개발 환경 구축 난이도 | ~~높음~~ **해소** | ~~중간~~ **완료** | Phase 0에서 IronClaw NEAR AI Cloud 실제 연동 완료. Intel TDX Attestation 검증 엔드포인트(`/v1/attestation/report`) 통합으로 하드웨어 신뢰 기반 확립. Phase 2에서 SHA-256 nonce 바인딩 전체 검증으로 전환 예정. |
| Confidential Intents 메인넷 출시 지연 | 중간 | 낮음 | 테스트넷 기반으로 전 기능 구현 완료 후 엔드포인트 변경만으로 전환 가능하도록 추상화 레이어 설계. |
| 보험사 API 연동 장벽 (폐쇄적 레거시 시스템) | 높음 | 높음 | 초기에는 보험다모아 등 공개 API + 수동 크롤링으로 카탈로그 구성. 이후 GA 제휴사를 통해 정식 API 접근권 확보. |
| 유전자 데이터 규제 불확실성 | 높음 | 중간 | 법률 자문 조기 수령 (Q2 2026), '건강 관리 서비스' 프레임으로 규제 샌드박스 진입. |
| Chain Abstraction Relayer 운영 비용 | 낮음 | 높음 | MVP 단계에서 멀티체인 미지원. Phase 3에서 Bitte Protocol 등 외부 Relayer 서비스 활용. |

---

---

## 5. Phase 0 구현 체크리스트 (Implementation Checklist)

> 8단계 구현 순서. 각 단계는 이전 단계의 검증 완료 후 착수한다.
> 데드라인: **2026-04-20**

---

### Stage 1 — 초기 세팅

#### 1-1. 프로젝트 생성 및 기본 설정
- [x] `npx create-next-app@latest` 실행 (typescript, tailwind, eslint, app router, src-dir, import-alias)
- [x] `npx shadcn@latest init` 실행 — 다크 테마, CSS 변수 선택
- [x] Shadcn 컴포넌트 추가: `button card dialog progress alert badge table tabs sonner`

#### 1-2. 패키지 설치
- [x] 애니메이션: `framer-motion`
- [x] 날짜/시간: `luxon`, `@types/luxon`
- [x] 국제화: `next-intl`
- [x] DB: `drizzle-orm`, `@libsql/client`, `drizzle-kit`, `dotenv`
- [x] Web3: `near-api-js` (`@nearai/client` — npm 미등록, Stage 7에서 별도 처리)
- [x] NEAR Wallet: `@near-wallet-selector/core`, `@near-wallet-selector/my-near-wallet`, `@near-wallet-selector/modal-ui`
- [x] 폼 검증: `zod`, `react-hook-form`, `@hookform/resolvers`
- [x] 유틸: `uuid`, `@types/uuid`
- [x] 폰트: `@fontsource/pretendard`

#### 1-3. 환경 변수 및 설정 파일
- [x] `.env.local` 생성 — `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXT_PUBLIC_NEAR_WALLET_NETWORK`
- [x] `drizzle.config.ts` 생성 — Turso dialect, `.env.local` 자동 로드, schema 경로 설정
- [x] `next.config.ts` — 보안 헤더 설정 (`X-Frame-Options`, `X-Content-Type-Options`, `CSP`)

#### 1-4. Turso DB 초기화
- [x] Turso CLI 설치 및 `turso auth login` (azerckid)
- [x] `turso db create mydna-local` 실행 (ap-northeast-1)
- [x] `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` `.env.local`에 기입

#### 1-5. DB 스키마 및 마이그레이션
- [x] `src/lib/db/schema.ts` 작성 — 6개 테이블 전체 (DB_SCHEMA.md 기준)
  - [x] `user_profiles`
  - [x] `analysis_sessions`
  - [x] `analysis_results`
  - [x] `insurance_products`
  - [x] `recommendation_carts` (구현 중 insurance_applications → recommendation_carts로 확정)
  - [x] `transactions` (구현 중 platform_earnings → transactions로 확정)
- [x] `npx drizzle-kit generate` 실행
- [x] `npx drizzle-kit migrate` 실행
- [x] `src/lib/db/seed.ts` 작성 — 5종 보험 상품 시드 데이터
- [x] `npx tsx src/lib/db/seed.ts` 실행

#### 1-6. 디자인 시스템 및 디렉토리 구조
- [x] `src/app/globals.css` — 사이버네틱 메디컬 다크 테마 CSS 변수 적용 (Electric Blue primary, Emerald 소각 색상)
- [x] `src/app/layout.tsx` — Inter + Pretendard 폰트, 전역 메타데이터, Sonner Toaster
- [x] 디렉토리 구조 생성: `components/modules/`, `lib/near/`, `lib/tee/`, `lib/zkp/`, `actions/`, `types/`, `messages/`
- [x] `public/mock/mock_genome_gentok.txt` 배치 — 젠톡 포맷 데모 유전자 파일

#### 1-7. 초기 세팅 검증
- [x] `npm run build` 빌드 성공 확인 (TypeScript 오류 0건)
- [x] Turso DB 5종 시드 상품 삽입 확인 (`turso db shell` 쿼리)

---

### Stage 2 — 랜딩 + NEAR 지갑 연결 (User Flow Step 1)

#### 2-1. NEAR Wallet 연동
- [x] `src/lib/near/wallet.ts` — NEAR Wallet Selector 초기화 (testnet, MyNearWallet)
- [x] Wallet Selector Modal UI 스타일 오버라이드 (다크 테마 일치)
- [x] 지갑 연결 상태 전역 관리 (React Context — `src/context/WalletContext.tsx`)

#### 2-2. 랜딩 페이지 UI
- [x] `src/app/page.tsx` — 히어로 섹션 (타이틀, 서브카피, CTA 버튼)
- [x] `src/components/modules/WalletConnect.tsx` — 지갑 연결/해제 버튼 컴포넌트
- [x] 지갑 연결 전/후 상태별 UI 분기 (미연결: 연결 버튼 / 연결됨: 주소 표시 + 다음 단계 버튼)
- [x] 지갑 주소 축약 표시 (앞 6자 + ... + 뒤 4자)

#### 2-3. DB 연동
- [x] `src/actions/upsertUserProfile.ts` — 지갑 주소 기반 `user_profiles` upsert Server Action
- [x] 지갑 연결 성공 시 Server Action 호출

#### 2-4. 검증
- [x] `npm run build` TypeScript 오류 0건 확인
- [x] NEAR Testnet 지갑 연결 → 헤더에 주소 표시 + 토스트 정상 동작 (`rogulus.testnet`)
- [x] DB에 `user_profiles` 레코드 생성 확인 (Drizzle Studio 검증)

---

### Stage 3 — 파일 업로드 (User Flow Step 2) ✓ 완료 2026-04-04

#### 3-1. 업로드 UI
- [x] `src/components/modules/FileUploadZone.tsx` — 드래그앤드롭 영역 컴포넌트
- [x] 파일 선택 버튼 + 드래그앤드롭 이벤트 처리
- [x] 데모용 Mock 파일 자동 선택 버튼 ("샘플 파일로 체험하기")
- [x] 업로드된 파일명, 크기 표시

#### 3-2. 파일 검증 (Zod)
- [x] 허용 MIME 타입 화이트리스트 검증 — 확장자 기반(.vcf, .txt, .csv, .pdf)으로 구현 (MIME은 브라우저 호환성 이슈로 보조)
- [x] 파일 크기 상한 검증: 5MB 초과 시 에러 메시지
- [x] 확장자 이중 검증 (.vcf, .csv, .pdf, .txt)

#### 3-3. 애니메이션
- [x] 파일 검증 통과 시 자물쇠 잠김 Framer Motion 애니메이션
- [x] 업로드 진행 Progress Bar

#### 3-4. DB 연동 및 전환
- [x] `src/actions/createSession.ts` — `analysis_sessions` 레코드 생성 Server Action (`status: 'uploading'`)
- [x] 업로드 완료 → `/analysis/[sessionId]` 화면으로 전환

---

### Stage 4 — Mock TEE 분석 + Noir ZKP + Memory Purge 애니메이션 (User Flow Step 3) ✓ 완료 2026-04-04

#### 4-1. 타입 정의
- [x] `src/types/genetic.ts` — `NormalizedGeneticProfile` 타입 + Zod 스키마
- [x] `src/types/tee-output.ts` — `TeeAnalysisOutput` 타입 + `teeAnalysisOutputSchema` (priorityOrder .min(4).max(4) Zod v4 호환)
- [x] `src/types/zkp.ts` — `ZkpProof` 인터페이스 (proofBytes, publicInputs, verificationKey)

#### 4-2. 파이프라인 로직
- [x] `src/lib/tee/mock-data.ts` — 젠톡 샘플 파일 내용 TS 상수화 (Vercel fs 접근 불안정 대응)
- [x] `src/lib/tee/normalizer.ts` — [SECTION] 헤더 기반 젠톡 TXT 파서 구현
  - [x] `.txt` 젠톡 포맷 파서 (실제 파일 형식 기준)
  - [x] 텍스트 레이블 → RiskLevel 변환 (주의 필요=high, 관심 필요=moderate, 정상=normal)
  - [x] VCF 수치 → RiskLevel 변환 (`scoreToLevel`)
- [x] `src/lib/tee/mock-tee.ts` — Mock TEE 함수 구현
  - [x] `runMockTeeAnalysis` 함수 (2초 지연 시뮬레이션)
  - [x] `buildPriorityOrder` 함수
  - [x] `buildAdvisoryMessages` 함수
- [x] `src/actions/updateSessionStatus.ts` — 세션 상태 전환 + 타임스탬프 기록
- [x] `src/actions/matchProducts.ts` — DB 상품 매칭 Server Action
- [x] `src/actions/runAnalysis.ts` — 전체 파이프라인 Server Action (파싱 → Mock TEE → ZKP → 상품 매칭 → DB 저장)

#### 4-3. Noir ZKP 회로 구현
- [x] `circuits/insurance_eligibility/Nargo.toml` 초기화
- [x] `circuits/insurance_eligibility/src/main.nr` 회로 작성
  - [x] `private input: risk_score: u8` — TEE 내부에서만 접근
  - [x] `public input: threshold: pub u8` — 보험사 공개 기준값
  - [x] `assert(risk_score >= threshold)` — 자격 충족 여부만 증명
- [x] `src/lib/zkp/prover.ts` — Phase 0 더미 proof 반환 (Vercel 배포 호환)
- [x] `src/lib/zkp/verifier.ts` — Phase 0 로컬 검증 (Phase 2: NEAR 온체인 검증 교체)
- [x] Phase 0 ZKP proof를 `analysis_results.zkp_proof_hash` DB 저장 완료
- 참고: nargo compile/prove/verify는 Phase 2에서 IronClaw TEE 내부에서 수행 (우리 웹 서버에 설치 불필요 — NEAR_PRIVACY_STACK_ARCH.md 6-1절 참조)

#### 4-4. 분석 진행 UI
- [x] `src/components/modules/TeeAnalysisProgress.tsx` — 5단계 Progress 컴포넌트
- [x] 5단계 상태 표시: `파일 파싱 중` → `TEE 분석 중` → `ZKP 증명 생성 중` → `위험 프로파일 생성` → `데이터 소각 완료`
- [x] Memory Purge 파티클 애니메이션 (12개 에메랄드 파티클 방사형 분산)
- [x] 소각 완료 메시지: "유전자 원본 데이터가 안전하게 소각되었습니다"
- [x] ZKP 완료 배지: "자격 증명 생성 완료 — 수치는 보험사에 전달되지 않습니다"

#### 4-5. 에러 처리
- [x] 파이프라인 실패 시 에러 상태 UI + "파일 업로드로 돌아가기" 버튼
- [x] 실패 시 `status = 'failed'` 업데이트
- [ ] 타임아웃(60초) UI — Stage 8 QA 단계에서 처리

#### 4-6. 전환
- [x] 분석 완료 → `analysis_sessions.status` 전환 (tee_processing → zkp_generating → completed → purged)
- [x] `/dashboard?sid=[sessionId]` 자동 전환 확인

---

### Stage 5 — 보험 추천 대시보드 (User Flow Step 4) ✓ 완료 2026-04-05

#### 5-1. 대시보드 페이지
- [x] `src/app/dashboard/page.tsx` — Server Component, sid 없거나 만료 시 /upload redirect
- [x] `src/actions/getDashboardData.ts` — analysis_results + insurance_products 조회, riskProfileSchema Zod 검증, 만료 확인

#### 5-2. 위험 프로파일 카드
- [x] `src/components/modules/RiskProfileCard.tsx` — 4개 카테고리별 위험 수준 표시
- [x] 수준별 색상 구분: `high → red`, `moderate → amber`, `normal → emerald`
- [x] 위험 플래그 한국어 레이블 매핑 (13종)

#### 5-3. 보험 상품 카드
- [x] `src/components/modules/InsuranceProductCard.tsx` — 상품 카드 UI
- [x] 상품명, 보험사, 월 보험료 표시
- [x] discountEligible === 1 시 원가 취소선 + ZKP 할인 뱃지 표시
- [x] 상품 선택 체크박스 + 선택 상태 강조 효과

#### 5-4. 탭 UI 및 카트 요약
- [x] `src/components/modules/DashboardClient.tsx` — 탭 UI (위험 프로필 / 추천 보험)
- [x] riskProfile 위험 수준 내림차순 정렬 (high > moderate > normal)
- [x] 선택 상품 소계 + ZKP 할인액 실시간 계산
- [x] 결제하기 버튼 (선택 없을 시 비활성화)

#### 5-5. 카트 생성 및 전환
- [x] `src/actions/createCart.ts` — 선택 상품 보험료 합산 + recommendation_carts 레코드 생성
- [x] 결제하기 → /checkout/[cartId] 이동 (Stage 6 연결 지점)
- [x] `src/app/checkout/[cartId]/page.tsx` — Stage 6에서 Server Component로 교체 완료
- [x] `src/lib/db/schema.ts` — `transactionInsertSchema` Zod insert schema 추가

---

### Stage 6 — Confidential Intents + Chain Signatures 결제 플로우 (User Flow Step 5) ✓ 완료 2026-04-05

#### 6-1. 결제 페이지 (CheckoutClient)
- [x] `src/components/modules/CheckoutClient.tsx` — 결제 확인 전용 페이지 (Dialog 대신 페이지 컴포넌트로 구현)
- [x] `src/app/checkout/[cartId]/page.tsx` — Server Component로 교체 (DashboardPage 패턴)
- [x] 선택 상품 목록, 총 보험료 요약 표시 (정가 / ZKP 할인 / 최종 USDC 분리)
- [x] "Confidential Checkout" 배지 + ZKP Proof 검증 완료 표시
- [x] 결제 완료 후 인라인 성공 화면 (txHash, 결제 지갑, NEAR Testnet 표시)

#### 6-2. Chain Signatures 연동
- [x] `src/lib/near/chain-signatures.ts` — NEAR Testnet 실거래 트랜잭션 구현 (Stage 10에서 교체, `wrap.testnet` 0.001 NEAR Transfer)
- [x] `v1.signer-prod.testnet` MPC 컨트랙트 testnet 실연동 — Stage 11-1 완료 (2026-04-06)
- [x] `deriveEthAddress` 함수 — NEAR 계정 기반 ETH 파생 주소 생성
- [x] `requestMpcSignature` 함수 — MPC 서명 요청 (250 Tgas + 1 yoctoNEAR)
- [x] `broadcastEthTransaction` 함수 — ETH Sepolia 브로드캐스트
- [ ] Phase 3 준비: SOL 파생 주소 생성 함수 분리 설계

#### 6-3. Confidential Intents + ZKP proof 결합
- [x] ZKP proof hash를 `submitConfidentialIntent` 파라미터로 전달 (Phase 0)
- [x] 트랜잭션 상태 전환: pending → broadcasting → confirmed 서버 사이드 처리
- [ ] Noir ZKP proof bytes를 Confidential Intents 트랜잭션 calldata에 첨부 — Phase 2 예정
- [ ] NEAR Testnet Confidential Intents 엔드포인트 설정 (Private Shards testnet) — Phase 2 예정
- [ ] 트랜잭션 서명 → 제출 → 컨트랙트 검증 단계별 Progress UI — Phase 2 예정

#### 6-4. 결제 완료 처리
- [x] `src/actions/getCartData.ts` — cartId 기반 결제 데이터 조회 Server Action
- [x] `src/actions/completeCheckout.ts` — 이중 결제 방지 + 상태 머신 전환 Server Action
- [x] `transactions` DB 레코드 생성 (`status: confirmed`, `txHash`, `confirmedAt` 저장)
- [x] `recommendation_carts.status` → `checked_out` 업데이트
- [x] 트랜잭션 해시 표시 (인라인 성공 화면, base58 44자)
- [x] abandoned / checked_out 카트 재진입 시 `/upload` redirect 처리
- [x] NEAR Testnet Explorer 링크 — Stage 10에서 구현 완료 (`https://testnet.nearblocks.io/txns/{txHash}`)

#### 6-5. 에러 처리
- [x] 트랜잭션 실패 시 `transactions.status = failed` + `recommendation_carts.status = active` 롤백
- [x] toast.error 피드백 (이미 처리된 카트, 지갑 주소 불일치, DB 오류)
- [ ] ZKP proof 첨부 실패 시 "증명 없는 결제 불가" 안내 — Phase 2 예정

---

### Stage 7 착수 전 선행 조건

> Stage 7 코드 작업을 시작하기 전에 아래 4가지를 순서대로 완료해야 한다.
> 4-1, 4-2(외부 조사)를 먼저 완료한 뒤 4-3, 4-4(작업)를 진행한다.
> 상세 내용: `docs/03_Technical_Specs/DEPLOYMENT_STRATEGY.md` 섹션 4

#### 외부 조사 (결과에 따라 Stage 7 범위가 달라짐)
- [x] `@nearai/client` npm 미등록 문제 — **A안 확정**: `openai` npm + IronClaw REST(`/v1/chat/completions`) 직접 호출
- [x] Confidential Intents testnet 엔드포인트 가용성 확인 — **메인넷 출시 완료** (2026-02-25), `@defuse-protocol/intents-sdk` 사용

#### 인프라 작업
- [x] `Dockerfile` + `.dockerignore` 작성 (next.config.ts standalone 설정) — [교정 2026-04-06] nargo CLI는 TEE 내부 실행이므로 Dockerfile에서 제거 대상
- [ ] GCP Cloud Run 또는 AWS App Runner 배포 테스트 (환경 변수 Secret 등록 포함)

#### 코드 작업
- [x] `prepareCheckout.ts` 생성 — 1단계: cart 선점 + transaction INSERT
- [x] `confirmCheckout.ts` 생성 — 3단계: txHash 수신 후 DB confirmed 처리
- [x] `CheckoutClient.tsx` — preparing → signing → confirming 3단계 플로우 적용
- [x] `chain-signatures.ts` — `signAndBroadcastIntent`로 개명, Phase 2 교체 지점 주석 추가

---

### Stage 7 — IronClaw 실제 연동

#### 7-1. NEAR AI Cloud 설정
- [x] NEAR AI Cloud 계정 생성 + 크레딧 충전 완료
- [x] `IRONCLAW_BASE_URL`, `IRONCLAW_API_KEY` 발급 및 `.env.local` 등록 완료
- [ ] IronClaw Agent 인스턴스 생성 (필요 시 — API 호출 방식 사용 시 생략 가능)

#### 7-2. IronClaw 연동 레이어 작성
- [x] `src/lib/tee/ironclaw-tee.ts` 작성 — `openai` npm + NEAR AI Cloud REST(`/v1/chat/completions`) 직접 호출
  - [x] `runIronClawAnalysis` 함수 — Mock TEE와 동일한 입출력 인터페이스
  - [x] System Prompt + User Context Prompt 주입 (`TeeAnalysisOutput` JSON 스키마 명시)
  - [x] 응답 JSON 파싱 + `teeAnalysisOutputSchema` Zod 검증
  - [x] 기본 모델: `Qwen/Qwen3-30B-A3B-Instruct-2507` (NEAR AI Cloud `/v1/models` 조회 기준)
- [x] `src/actions/runAnalysis.ts` 수정 — 환경 변수(`USE_REAL_TEE=true`) 기반 Mock/Real 분기
- [x] E2E 동작 확인 — 샘플 파일 업로드 → IronClaw 분석 → 데이터 소각 메시지 표시 완료

#### 7-3. 자격증명 및 보안 설정
- [x] `IRONCLAW_API_KEY` 서버 사이드 전용 환경 변수 확인 (`NEXT_PUBLIC_` 접두사 미사용)
- [ ] IronClaw 허용 엔드포인트 화이트리스트 설정

#### 7-4. Chain Signatures 실연동 검증
- [ ] `v1.signer` MPC 컨트랙트 testnet 서명 요청 실동작 확인 (브라우저 지갑 필요 — 수동)
- [x] Chain Signatures 파생 키(Derived Key) 생성 동작 확인 (`v1.signer-prod.testnet` view call 직접 검증 2026-04-10)
- [ ] MPC 서명 → 트랜잭션 브로드캐스트 전체 흐름 E2E 확인 (브라우저 지갑 + testnet 잔액 필요 — 수동)
- [x] Phase 3 대비: ETH 파생 주소 생성 함수 동작 확인 (`deriveEthAddress` view call 검증 완료) / SOL은 Phase 3 stub

#### 7-5. Noir ZKP 온체인 검증 연동 (Phase 2 준비)
- [ ] NEAR 스마트 컨트랙트에 Noir verifier 함수 추가 (`verify_proof(proof_bytes, public_inputs)`) — Phase 2
- [x] testnet 컨트랙트 배포 확인 (`zkp.rogulus.testnet` `is_proof_registered` view call 응답 정상 2026-04-10)
- [x] Phase 0 로컬 검증 → Phase 2 온체인 검증 전환 포인트 주석 표시 (`submitZkpProof.ts` 주석 완료)

#### 7-6. E2E 검증
- [x] Mock 파일 → IronClaw API → `TeeAnalysisOutput` JSON 수신 확인
- [x] Playwright E2E 21/21 통과 — 공개 접근 페이지 전체 검증 (2026-04-10)
- [ ] Noir ZKP proof 생성 → proof bytes 포함 여부 확인 (Phase 2 TEE 실연동 시)
- [ ] Chain Signatures MPC 서명 → Confidential Intents 트랜잭션 제출 확인 (브라우저 지갑 필요 — 수동)
- [ ] 전체 플로우 (업로드 → TEE → ZKP → 대시보드 → 서명 → 결제 완료) E2E 완주 (브라우저 지갑 필요 — 수동)

---

### Stage 8 — QA + 데모 준비

#### 8-1. 코드 품질
- [x] `console.log` 전체 제거 (seed.ts CLI 스크립트 제외 — 프로덕션 코드 0건)
- [x] TypeScript 엄격 모드(`strict: true`) 오류 0건
- [x] 사용하지 않는 import 제거 (page.tsx, TeeAnalysisProgress.tsx, wallet.ts)
- [x] `NEXT_PUBLIC_` 접두사 환경 변수 노출 여부 전수 점검 — 민감 변수 미노출 확인

#### 8-2. 보안 체크리스트 검토
- [x] `SECURITY_CHECKLIST.md` Phase 0 해당 항목 검토 완료
- [x] CSP, X-Frame-Options, X-Content-Type-Options 헤더 적용 확인 (`next.config.ts`)
- [x] Turso DB에 유전자 원본 데이터 저장 여부 확인 (카테고리 레벨 JSON만 저장)
- [x] 파일 업로드 확장자 화이트리스트 동작 확인 (.vcf/.txt/.csv/.pdf, Zod 검증)

#### 8-3. 성능 및 접근성
- [x] Lighthouse Performance 점수 70점 이상 — Vercel 프로덕션 실측 **87** / 100 (2026-04-10)
- [x] Lighthouse Accessibility 점수 85점 이상 — Vercel 프로덕션 실측 **100** / 100 (2026-04-10)
- [x] Best Practices **96** / 100, SEO **100** / 100 (2026-04-10)
- [ ] Turso DB 쿼리 응답 50ms 이내 확인 (직접 측정 필요)

#### 8-4. 데모 시나리오 검증
- [ ] `DEMO_SCENARIO.md` 기준 90~120초 시연 시나리오 처음부터 끝까지 막힘 없이 완주
- [x] Mock 파일(`mock_genome_gentok.txt`) → IronClaw TEE → 데이터 소각 동작 확인
- [ ] NEAR Testnet 지갑 연결 + 더미 트랜잭션 서명 최종 동작 확인 (수동)
- [ ] Memory Purge 애니메이션 데모 시 정상 재생 확인 (수동)

#### 8-5. 제출 패키지 준비
- [x] GitHub 레포지토리 정리 (README 해커톤용으로 교체, .env.example 작성 완료)
- [x] E2E 테스트 suite 구성 및 21/21 통과 확인 (Playwright, 2026-04-10)
- [ ] 피치덱 (`PITCH_DECK.md`) 최종 검토
- [ ] 데모 영상 녹화 (`DEMO_SCENARIO.md` 씬 순서대로, 목표 90~120초)
- [ ] 해커톤 제출 폼 작성 (GitHub URL, 데모 영상 URL, 피치덱)

#### 8-6. 보험 가입 확인서 화면 (UX 완성도)
> 결제 완료 후 가상의 보험 증서를 보여주어 사용자 경험을 완성하는 항목.
> 실제 보험 계약이 아닌 데모용 확인서이며, 해커톤 심사위원 인상에 중요한 요소.

- [x] `CheckoutClient.tsx` 결제 완료 화면 → 보험 가입 확인서로 확장
  - [x] 증서 번호 표시 (`MYD-` + txId 앞 8자리)
  - [x] 가입일, 지갑 주소, ZKP 검증 완료 뱃지
  - [x] 가입 상품 목록 (상품명, 보장 카테고리, 월 보험료)
  - [x] 월 보험료 합계 + Confidential Intents 보호 문구
  - [x] "확인서 인쇄" 버튼 (`window.print()`)
  - [x] "처음으로 돌아가기" 버튼
- [x] 상세 명세: `docs/02_UI_Screens/SCREEN_SPEC.md` Section 6 참조

---

### Stage 9 — ZKP 프로토콜 흐름 시각화 + DNA 배경 애니메이션 ✓ 완료 2026-04-05

> 데모 퀄리티 향상용. Stage 8(QA/데모 준비) 완료 후 착수.

#### 9-1. 터미널 스타일 ZKP 흐름 로그 컴포넌트 ✓ 완료
- [x] `src/components/modules/ZkpFlowDiagram.tsx` — Framer Motion 기반 터미널 로그 시각화
  - [x] macOS 터미널 스타일 헤더 (신호등 버튼 + `tee-analysis — ironclaw runtime`)
  - [x] 단계별 로그 누적 표시 (200ms 간격 순차 fade-in, 완료 후 사라지지 않음)
  - [x] 색상 구분: default(green) / success(emerald) / private(yellow) / system(zinc) / error(red)
  - [x] `[PRIVATE — not exposed to insurer]` 노란색 강조로 프라이버시 가시화
  - [x] 로그 단계: `file_hash` 전송 → TEE 분석 → Noir ZKP → proof_bytes 반환 → 소각 완료

#### 9-2. TeeAnalysisProgress 통합 ✓ 완료
- [x] `TeeAnalysisProgress.tsx` 중앙 스피너 영역 → `ZkpFlowDiagram`으로 교체
- [x] 기존 Progress Bar, 단계 인디케이터, Memory Purge 파티클, 에러 상태 UI 유지
- [x] 자동 `router.push` 제거 → `isDone` 상태로 전환
- [x] 분석 완료 후 "대시보드로 이동" 버튼 표시 (사용자가 로그 확인 후 직접 클릭)

#### 9-3. 검증 ✓ 완료
- [x] 전체 분석 플로우(파싱 → TEE → ZKP → 소각) 애니메이션 동기화 확인
- [x] `npm run build` TypeScript 오류 0건 확인

#### 9-4. 랜딩 페이지 DNA 배경 애니메이션 ✓ 완료
- [x] `src/components/modules/DnaBackground.tsx` — React Three Fiber 3D DNA 이중나선
  - [x] 2.5회전 TubeGeometry 나선 2가닥 (Blue / Emerald 발광)
  - [x] 염기쌍 CylinderGeometry (40개) + 끝점 구체 + 나선 노드 구체
  - [x] Y축 + Z축 동시 자동 회전 (텀블링 효과, Y: 0.0625 / Z: 0.028 rad/s)
  - [x] 마우스 틸트 (X/Z축 lerp, TILT_X_MAX 0.28)
  - [x] 마우스 근접 시 호버 색상 변경 — p1/p2 양쪽 NDC 투영 감지
    - [x] 직선 → Amber(#fbbf24), 구체 → 흰색(#ffffff)
  - [x] `pointer-events: none` 처리
  - [x] `prefers-reduced-motion` 미디어 쿼리 대응
  - [x] opacity 0.11 — 배경으로서 텍스트 가독성 최적화
  - [x] `group scale={[3,3,3]}` 비례 확대
- [x] `src/app/page.tsx`: `next/dynamic` SSR:false lazy import 적용
- [x] 콘텐츠 `z-10`으로 DNA 위 레이어 분리

#### 9-5. 네비게이션 개선 ✓ 완료
- [x] 전체 페이지 헤더 `MyDNA Insurance Agent` 로고 → 홈(`/`) 링크 연결
  - [x] `src/app/page.tsx`, `src/app/upload/page.tsx`, `src/app/analysis/[sessionId]/page.tsx` 공통 적용
  - [x] `hover:opacity-80 transition-opacity` 인터랙션 추가

---

### Stage 10 — NEAR Testnet 실연동 + Confidential Intents 인텐트 패널 ✓ 완료 2026-04-05

> Stage 6 Phase 0 Mock을 Phase 1 Testnet 실연동으로 교체. `@defuse-protocol/intents-sdk` near-api-js v7 충돌로 SDK 미사용, 인텐트 구조 수동 구현.

#### 10-1. Chain Signatures 실거래 트랜잭션 ✓ 완료
- [x] `src/lib/near/chain-signatures.ts` — 전면 교체
  - [x] `initiateNearTransaction(cartId, selector)` 함수 구현 — WalletSelector v10 borsh 포맷
  - [x] Action: `{ transfer: { deposit: "1000000000000000000000" } }` (0.001 NEAR)
  - [x] Receiver: `wrap.testnet` (항상 존재하는 testnet 계정)
  - [x] `callbackUrl`: `/checkout/${cartId}` — BrowserWallet 리다이렉트 복귀 처리
  - [x] InjectedWallet(팝업): `FinalExecutionOutcome.transaction.hash` 직접 추출
  - [x] BrowserWallet(리다이렉트): `null` 반환 → `?transactionHashes=` useEffect 처리
- [x] `src/components/modules/CheckoutClient.tsx` — 3단계 결제 플로우 (preparing → signing → confirming)
  - [x] `sessionStorage` — 리다이렉트 복귀 시 txId 복원
  - [x] `prepareCheckout` / `confirmCheckout` Server Action 분리
  - [x] InjectedWallet / BrowserWallet 분기 처리

#### 10-2. CSP 및 네비게이션 보강 ✓ 완료
- [x] `next.config.ts` — NEAR RPC 도메인 CSP connect-src 추가
  - [x] `https://*.fastnear.com`, `https://*.pagoda.co`, `https://rpc.testnet.near.org`, `https://rpc.mainnet.near.org`
- [x] `src/components/modules/AppHeader.tsx` — 전체 페이지 공통 헤더 컴포넌트 신규 생성
  - [x] MyDNA 로고 → `/` 홈 링크, 선택적 Back 버튼, WalletConnect 포함
  - [x] 전체 5개 페이지(홈/업로드/분석/대시보드/결제) 적용

#### 10-3. Confidential Intents 인텐트 패널 ✓ 완료
> `@defuse-protocol/intents-sdk` v0.58.2가 near-api-js v7 → v5 다운그레이드를 요구하므로 SDK 미설치.
> 인텐트 데이터 구조를 수동으로 구성하여 결제 UI에 시각화.

- [x] `CheckoutClient.tsx` — `ConfidentialIntentPanel` 컴포넌트 추가
  - [x] 결제 버튼 상단에 Confidential Intent 구조 표시
  - [x] `intent_type: "insurance_premium_payment"`, `zkp_proof_hash` (truncated), `product_ids` 목록, `estimated_usdc`, `network: "near_testnet"`, `intent_hash` (클라이언트 파생 16진수)
  - [x] `[PRIVATE — not exposed to insurer]` 노란색 강조
  - [x] 결제 완료 후 증서 화면에 "Confidential Intent 실행 완료" 배지 표시
- [ ] Defuse Protocol Solver 네트워크 실연동 — Phase 2 예정 (intents-sdk near-api-js 버전 충돌 해소 후)
- [ ] Private Shard 기반 Confidential 정산 — Phase 2 예정

> **`@defuse-protocol/intents-sdk` 다운그레이드 미설치 사유 (2026-04-05 조사)**
>
> `npm install @defuse-protocol/intents-sdk --dry-run` 결과, 해당 SDK는 `near-api-js@5.1.1`을 요구하며 현재 프로젝트의 `near-api-js@7.2.0`을 v5로 다운그레이드한다.
> 다운그레이드 시 예상되는 문제점:
>
> 1. **`@near-js/*` 하위 패키지 버전 충돌** — `@near-wallet-selector/core@10.x`는 `@near-js/types@^2.x`, `@near-js/transactions@^2.x`를 요구한다. intents-sdk가 끌어오는 v5 계열은 `@near-js/*@1.x`를 설치하여 node_modules 내에 동일 패키지의 두 버전이 공존하게 된다. 같은 타입이 다른 인스턴스로 인식되어 TypeScript에서 `Type 'Transaction' is not assignable to type 'Transaction'` 류의 타입 에러가 발생한다.
> 2. **borsh 직렬화 버전 충돌** — `near-api-js@7`은 `borsh@2.0.0`, intents-sdk 의존 계열은 `borsh@1.0.0`을 사용한다. 트랜잭션 직렬화 포맷이 달라 현재 동작 중인 지갑 서명 플로우(InjectedWallet/BrowserWallet)가 깨질 수 있다.
> 3. **현재 동작하는 결제 플로우 파손 위험** — 위 두 가지 이유로 다운그레이드 시 Stage 10에서 구현·검증된 실거래 트랜잭션 서명이 정상 동작하지 않을 가능성이 높다.
>
> **결론**: near-api-js v7 대응 버전의 intents-sdk 출시 또는 NEAR 생태계의 버전 통일 이후 Phase 2에서 재검토한다. 이 문제는 NEAR 개발자 포럼에서도 공개적으로 논의된 생태계 전반의 이슈이며, 우리 프로젝트만의 특수 상황이 아니다.

#### 10-4. NEAR Explorer 링크 ✓ 완료
- [x] `CheckoutClient.tsx` 결제 완료 화면에 `https://testnet.nearblocks.io/txns/{txHash}` 링크 표시
- [x] `target="_blank" rel="noopener noreferrer"` 적용

---

### Stage 11 — Phase 2: 실연동 (해커톤 이후)

> 해커톤 제출 후 착수. 2026-04-06 아키텍처 정합성 검토 결과를 반영하여 구현 범위를 확정함.
> 상세 구현 명세: `docs/03_Technical_Specs/PHASE2_IMPLEMENTATION_SPEC.md`

#### 구현 범위 요약 (2026-04-06 확정)

| # | 항목 | 상태 | 사유 |
|---|------|------|------|
| 11-1 | v1.signer MPC Chain Signatures | **완료** 2026-04-06 | `near-api-js` v7 RPC 직접 호출. `ethers` 패키지로 서명 복원. |
| 11-2 | ZKP: IronClaw TEE 실제 proof 생성 + proof hash 온체인 등록 | **구현 예정** | `prover.ts`를 TEE API 호출 래퍼로 교체. `zkp.rogulus.testnet` hash 등록은 이미 완료 |
| 11-3 | Confidential Intents SDK 연동 | **대기** | `@defuse-protocol/intents-sdk`가 `near-api-js` v5를 요구하여 현재 프로젝트(v7)와 버전 충돌. SDK 업데이트 대기 |
| 11-4 | Noir ultraplonk 온체인 수학적 검증 | **향후 과제** | NEAR 생태계에 ultraplonk verifier 공식 라이브러리 부재. `barretenberg-sys` Rust FFI 바인딩 또는 순수 Rust 구현 필요. Aztec Protocol 팀 협력 필수 |

---

#### 11-1. v1.signer MPC Chain Signatures 실연동 ✓ 완료 2026-04-06

> **목적**: NEAR 지갑 하나로 ETH/BTC/SOL 보험료 결제 (멀티체인 보험 결제)
> **외부 의존성**: 없음 — NEAR JSON-RPC 직접 호출 + `ethers` 패키지로 구현
> **비고**: `near-api-js` v7에서 `connect`/`keyStores` 제거됨 → `fetch`로 view call 직접 호출

- [x] `src/lib/near/chain-signatures.ts` — `deriveEthAddress` 함수 추가
  - [x] NEAR JSON-RPC `call_function` 직접 호출: `v1.signer-prod.testnet` → `derived_public_key`
  - [x] compressed secp256k1 공개키 → ETH 주소 변환 (`ethers.computeAddress`)
- [x] `src/lib/near/chain-signatures.ts` — `requestMpcSignature` 함수 추가
  - [x] WalletSelector FunctionCall: `sign({ payload, path, key_version })` 호출
  - [x] 250 Tgas + 1 yoctoNEAR deposit
  - [x] MPC 응답 `receipts_outcome` → `{ big_r, s }` 추출
- [x] `src/lib/near/chain-signatures.ts` — `broadcastEthTransaction` 함수 추가
  - [x] MPC `{ bigR, s }` → v=27/28 복구 비트 탐색 → `ethers.Signature` 복원
  - [x] Ethereum Sepolia 브로드캐스트 (`https://rpc.sepolia.org`)
- [x] `src/lib/near/chain-signatures.ts` — `getEthBalance` 함수 추가
- [x] `CheckoutClient.tsx` — 체인 선택 UI 추가 (NEAR Testnet / ETH Sepolia)
  - [x] ETH 선택 시 파생 주소 + 잔액 자동 표시
  - [x] 잔액 부족(< 0.001 ETH) 시 결제 버튼 비활성화
- [x] `src/lib/db/schema.ts` — `transactions.network` enum에 `ethereum_sepolia` 추가
- [x] `next.config.ts` — CSP `connect-src`에 `https://rpc.sepolia.org` 추가
- [ ] E2E 검증: NEAR 지갑 서명 → MPC 서명 → ETH 트랜잭션 브로드캐스트 확인 (파생 주소 Faucet 충전 필요)
- [ ] Phase 3 준비: SOL 파생 주소 생성 함수 분리 설계

---

#### 11-2. ZKP: IronClaw TEE 실제 proof 생성 + proof hash 온체인 등록 [구현 예정]

> **목적**: Phase 0 더미 proof를 IronClaw TEE가 생성한 실제 proof bytes로 교체
> **외부 의존성**: 없음 — IronClaw API 호출 + 기존 `zkp.rogulus.testnet` 컨트랙트 활용
> **참고**: `@noir-lang/noir_js`, `@aztec/bb.js`는 TEE 런타임 내장. 우리 웹 서버에 설치 불필요 (NEAR_PRIVACY_STACK_ARCH.md 6-1절)

- [ ] `src/lib/zkp/prover.ts` 교체
  - [ ] 현재: 더미 문자열(`phase0_mock_proof_...`) 직접 반환
  - [ ] 교체: IronClaw TEE API 호출 → TEE 내부에서 Noir 회로 실행 → proof bytes 수신
  - [ ] `risk_score`는 TEE 내부에서만 사용, TEE 외부(우리 서버)로 절대 미노출
- [ ] `src/lib/zkp/verifier.ts` 교체
  - [ ] 현재: `proofBytes.startsWith("phase0_mock_proof_")` 문자열 검사
  - [ ] 교체: 수신된 proof bytes의 유효성 확인 + `zkp.rogulus.testnet`에 proof hash 온체인 등록
- [ ] `src/actions/runAnalysis.ts` — `generateZkpProof` 호출부를 TEE 응답 내 proof bytes 추출로 변경
- [ ] E2E 검증: 파일 업로드 → IronClaw TEE 분석 + proof 생성 → proof hash 온체인 등록 → 대시보드 표시

---

#### 11-3. Confidential Intents SDK 연동 [대기]

> **상태**: 대기 — `@defuse-protocol/intents-sdk`의 `near-api-js` v7 대응 버전 출시 후 착수
>
> **대기 사유 (2026-04-05 조사)**:
> - `@defuse-protocol/intents-sdk` v0.58.2는 `near-api-js@5.1.1`을 요구
> - 현재 프로젝트는 `near-api-js@7.2.0` 사용 중
> - 다운그레이드 시 `@near-wallet-selector/core@10.x` 타입 충돌, `borsh` 직렬화 버전 충돌,
>   Stage 10에서 검증된 실거래 트랜잭션 서명 플로우 파손 위험
> - NEAR 개발자 포럼에서도 공개적으로 논의된 생태계 전반의 이슈
>
> **재개 조건**: `intents-sdk`가 `near-api-js` v7을 지원하는 버전 출시 시 착수

- [ ] `@defuse-protocol/intents-sdk` 설치 (near-api-js 버전 충돌 해소 후)
- [ ] `src/lib/near/chain-signatures.ts` 교체
  - [ ] 현재 `Transfer` 액션 → `IntentsClient.submitIntent()` 호출로 교체
  - [ ] intent payload: `type`, `zkp_proof_hash`, `product_ids`, `amount_usdc`, `network` 포함
  - [ ] Defuse Protocol Solver 네트워크 응답: `intentId`, `solverTxHash` 수신
- [ ] `CheckoutClient.tsx` — ConfidentialIntentPanel "Phase 2 예정" 라벨 제거, 실제 intent 결과 표시
- [ ] `src/lib/db/schema.ts` — `transactions` 테이블 `intentId` 컬럼 추가
- [ ] `src/actions/confirmCheckout.ts` — `intentId` 저장 로직 추가
- [ ] `next.config.ts` — CSP `connect-src`에 Defuse Protocol 엔드포인트 추가
- [ ] E2E 검증: Confidential Intent 제출 → Solver 응답 → 결제 완료 흐름 확인

---

#### 11-4. Noir ultraplonk 온체인 수학적 검증 [향후 과제]

> **상태**: 향후 과제 — NEAR 생태계에 공식 지원 라이브러리 부재
>
> **보류 사유**:
> - NEAR 스마트 컨트랙트에서 ultraplonk pairing check를 실행하려면 `barretenberg-sys` Rust FFI 바인딩
>   또는 순수 Rust ultraplonk 구현체가 필요하나, 현재 NEAR 생태계에 공식 지원 없음
> - NEAR 런타임 제약(gas limit 300Tgas, WASM 4MB) 내 pairing check 가능 여부 미검증
> - Aztec Protocol 팀의 기술 지원 또는 공동 개발 필요
> - 예상 소요: 수주 ~ 수개월
>
> **현재 대체 구현**: `zkp.rogulus.testnet` 컨트랙트에 proof hash를 온체인 등록하는 방식으로
> "이 proof는 TEE 내부에서 검증되었다"는 선언적 증명을 제공 (11-2에서 구현)
>
> **재개 조건**: Aztec Protocol의 NEAR 호환 verifier 라이브러리 출시 또는 NEAR 팀의 공식 ZKP verifier 지원

- [ ] `contracts/zkp_verifier/src/lib.rs` — `verify_proof_onchain` 함수 추가
  - [ ] `barretenberg-sys` Rust FFI 바인딩 연구 또는 순수 Rust ultraplonk 구현체 도입
  - [ ] NEAR 런타임 제약(gas limit 300Tgas, WASM 4MB) 내 pairing check 가능 여부 검토
  - [ ] Aztec Protocol 팀 기술 지원 요청 필요
- [ ] `zkp.rogulus.testnet` 재배포 (verify_proof_onchain 추가 후)
- [ ] `nargo verify`와 온체인 검증 결과 일치 E2E 확인

---

---

### Stage 13 — AI 매칭 결과 단계별 공개 UX ✓ 완료 2026-04-08

> **목적**: 분석 완료 후 대시보드에서 보험 상품이 갑자기 등장하는 문제 해결.
> AI가 왜 이 상품을 추천했는지 사용자가 납득한 상태에서 상품을 보도록 3단계 공개 흐름 구현.
>
> **참고 설계 문서**: [AI_MATCHING_PIPELINE.md Section 8](./AI_MATCHING_PIPELINE.md)

#### 13-1. DB 스키마 변경

- [x] `src/lib/db/schema.ts` — `analysisResults` 테이블에 컬럼 4개 추가
  - [x] `advisoryMessages TEXT` — 카테고리별 AI 권고 메시지 (JSON)
  - [x] `reasoning TEXT` — AI 추천 근거 요약 문장
  - [x] `coverageGapSummary TEXT` — 보장 공백 한 줄 요약
  - [x] `priorityOrder TEXT` — 카테고리 우선순위 배열 (JSON)

#### 13-2. DB 마이그레이션

- [x] `npx drizzle-kit generate` — `drizzle/0001_slimy_whistler.sql` 생성
- [x] `npx drizzle-kit migrate` — Turso DB 적용 완료

#### 13-3. runAnalysis.ts 업데이트

- [x] `db.insert(analysisResults)` 호출 시 신규 4개 필드 저장

#### 13-4. getDashboardData.ts 업데이트

- [x] `DashboardData` 인터페이스에 `advisoryMessages`, `reasoning`, `coverageGapSummary`, `priorityOrder` 추가
- [x] DB 조회 결과에서 JSON 파싱 + Zod 검증 후 반환
- [x] 기존 레코드(컬럼 값 null) graceful fallback 처리

#### 13-5. DashboardClient.tsx UI 구현

- [x] **Step 1 — 위험 프로파일 요약**: `priorityOrder` 기준 카드 정렬, 위험 등급 배지
- [x] **Step 2 — AI 추천 근거**: `coverageGapSummary` 경고 배너 + `reasoning` 박스 + 카테고리별 `advisoryMessages`
- [x] **Step 3 — 추천 상품**: staggered animation + 카드별 "추천 이유" 한 줄 표시
- [x] `advisoryMessages`/`reasoning`/`coverageGapSummary` null 시 기존 Tabs UI로 자동 fallback
- [x] `messages/ko.json`, `messages/en.json` — `dashboard.reveal.*` 번역 키 추가

#### 13-6. 빌드 검증

- [x] `npm run build` TypeScript 오류 0건 확인

---

### Stage 14 — Intel TDX Attestation 통합 ✓ 완료 2026-04-13

> **목적**: NEAR AI Cloud IronClaw TEE의 하드웨어 신뢰를 검증 가능한 형태로 사용자에게 노출.
> `GET https://cloud-api.near.ai/v1/attestation/report` 공개 엔드포인트를 통해 Intel TDX Quote를
> 분석 파이프라인에 통합하고, 세션 DB에 검증 결과를 기록한 후 UI 배지로 표시.
>
> **참고 명세**: [TEE_ATTESTATION_SPEC.md](../03_Technical_Specs/TEE_ATTESTATION_SPEC.md)

#### 14-1. 타입 정의

- [x] `src/types/attestation.ts` — `AttestationReport` Zod 스키마 + `AttestationVerificationResult` 타입

#### 14-2. 라이브러리 구현

- [x] `src/lib/tee/attestation.ts`
  - [x] `generateNonce()` — 32바이트 랜덤 nonce → 64자 hex
  - [x] `fetchAttestationReport()` — NEAR AI Cloud `/v1/attestation/report` 호출 (10s timeout)
  - [x] `verifyNonceBinding()` — Phase 0: `report_data` 필드 존재 확인 (Phase 2: SHA-256 비교로 전환 예정)

#### 14-3. Server Action

- [x] `src/actions/verifyAttestation.ts` — `"use server"` Action
  - [x] nonce 생성 → attestation 조회 → 3단계 검증 결과 반환
  - [x] `IRONCLAW_MODEL` 환경 변수 지원 (기본값: `Qwen/Qwen3-30B-A3B-Instruct-2507`)

#### 14-4. DB 스키마 변경

- [x] `src/lib/db/schema.ts` — `analysisSessions` 테이블에 컬럼 2개 추가
  - [x] `attestationNonce TEXT` — 분석 시 생성된 nonce (재현 및 감사 추적용)
  - [x] `attestationVerified INTEGER (boolean)` — 검증 성공 여부

#### 14-5. DB 마이그레이션

- [x] `npx drizzle-kit generate` — `drizzle/0003_purple_stardust.sql` 생성
- [x] `npx drizzle-kit migrate` — Turso DB 적용 완료

#### 14-6. runAnalysis.ts 파이프라인 통합

- [x] `tee_processing` 상태 진입 후 attestation 선행 호출
- [x] nonce + 검증 결과를 `analysisSessions` 레코드에 저장
- [x] Phase 0 비차단 설계 — 엔드포인트 일시 불가 시 분석 파이프라인 계속 진행

#### 14-7. UI 배지

- [x] `src/components/modules/TeeAnalysisProgress.tsx` — zkp 단계 이후 `Intel TDX Attestation Verified` 배지 표시
  - [x] Framer Motion `AnimatePresence` 페이드인 애니메이션
  - [x] `ShieldCheck` 아이콘 (lucide-react), 파란색 테마

#### 14-8. 명세 문서

- [x] `docs/03_Technical_Specs/TEE_ATTESTATION_SPEC.md` 작성

#### 14-9. 빌드 검증

- [x] `npm run build` TypeScript 오류 0건 확인

---

### Stage 15 — AI 상담 레이어 (The Secret Keeper) — 구현 완료 (2026-04-14)

> **목적**: TEE 분석 완료 후 대시보드에 부가 편의 기능으로 채팅 인터페이스 추가.
> 사용자가 위험 레이블 기반으로 질병·보험 관련 질문을 하면 공감하는 말투로 답변.
> 원본 DNA 시퀀스는 컨텍스트에 포함하지 않으며, 세션 종료 시 대화 맥락 소각.
>
> **참고 명세**: [SECRET_KEEPER_IMPL_SPEC.md](../03_Technical_Specs/SECRET_KEEPER_IMPL_SPEC.md)

#### 15-1. 시스템 프롬프트 파일

- [x] `src/lib/tee/concierge-system-prompt.ts` 작성 (템플릿 리터럴, fs 미사용 — Vercel 배포 안정성)
  - [x] 공감 말투 원칙 4개 (걱정 공감 → 정보 제공 → 보험 연결 → 사용자 언어로 답변)
  - [x] 가드레일 5개 (원본 DNA 거부, 확정 진단 금지, 전문의 권고, 길이 제한, 세션 망각 안내)
  - [x] `buildSystemPrompt(riskProfileContext: string): string` 함수로 export

#### 15-2. 타입 정의

- [x] `ChatMessage` 인터페이스 — `ConciergeChat.tsx` 내 인라인 정의 (별도 파일 불필요 판단)
  - [x] `role: 'user' | 'assistant'`, `content: string`
  - [x] Zod 입력 스키마 — `chatWithConcierge.ts` 내 `inputSchema`로 통합 정의

#### 15-3. Server Action

- [x] `src/actions/chatWithConcierge.ts`
  - [x] `buildSystemPrompt()` 호출로 riskProfile 컨텍스트 주입 (md 파일 로드 방식 → TS 함수 호출로 변경)
  - [x] `riskProfile` → 카테고리·레벨 레이블 변환 (`formatRiskContext`)
  - [x] NEAR AI Cloud 호출 (기존 `IRONCLAW_BASE_URL` / `IRONCLAW_API_KEY` 재사용)
  - [x] `max_tokens: 600`, `temperature: 0.7`
  - [x] 입력 Zod 검증 (`message.max(500)`, `history.max(20)`)

#### 15-4. UI 컴포넌트

- [x] `src/components/modules/ConciergeChat.tsx`
  - [x] 메시지 목록 표시 (user / assistant 말풍선 구분)
  - [x] 입력창 + 전송 버튼 (Enter 전송 / Shift+Enter 줄바꿈)
  - [x] 전송 중 로딩 상태 표시 (타이핑 인디케이터 애니메이션)
  - [x] 세션 내 대화 이력은 `useState`로만 관리 (DB 미저장)
  - [x] 컴포넌트 언마운트 시 이력 자동 소각 (React 상태 초기화)

#### 15-5. 대시보드 통합

- [x] `src/components/modules/DashboardClient.tsx` — `<ConciergeChat riskProfile={...} />` 삽입 (Client Component 계층에 통합)
- [ ] `messages/ko.json`, `messages/en.json` — `concierge.*` 번역 키 추가 (현재 하드코딩, 추후 i18n 전환)
  - [ ] `concierge.placeholder` — 입력창 안내 문구
  - [ ] `concierge.disclaimer` — "의학적 진단이 아닙니다" 안내 문구

#### 15-6. 빌드 검증

- [x] `npm run build` TypeScript 오류 0건 확인
- [ ] 샘플 질문 입력 → NEAR AI Cloud 응답 수신 확인
- [ ] 원본 DNA 시퀀스 요청 → 거절 답변 확인 (TS-03)
- [ ] 새 세션 접속 → 이전 대화 기억 안 함 확인 (TS-02)

---

### Stage 16 — ZKP-in-TEE: IronClaw 인클레이브 내 Noir WASM 배포 ✓ 완료 2026-04-19

> **목적**: Phase 0 더미 proof를 IronClaw TEE 인클레이브 내부에서 생성한 실제 proof bytes로 교체.
> `risk_score`(Private Input)가 TEE 외부로 절대 유출되지 않는 완전 격리형 프라이버시 파이프라인 완성.
>
> **상세 구현 명세**: `docs/03_Technical_Specs/ZKP_IN_TEE_WASM_IMPL_SPEC.md`

#### IronClaw WASM 지원 타임라인

| 날짜 | 버전 | 내용 | 비고 |
|---|---|---|---|
| 2026-03-10 | v0.17.0 | 커스텀 WASM 툴 배포 최초 도입 | 실험적 단계 — 프로젝트 시작 시점 |
| 2026-03-xx | — | 본 프로젝트 개발 시작 | v0.17.0 불안정으로 분석 로직 구현 우선 |
| 2026-04-11 | v0.25.0 | 커스텀 WASM 툴 배포 프로덕션 수준 공식 지원 | Phase 2 착수 가능 시점 |
| 2026-04-18 | — | Final Pitch Day (NEAR Protocol 트랙 1위) | Phase 2 착수 |
| 2026-04-19 | — | Stage 16 구현 완료 | Phase 2 완료 |

#### 구현 아티팩트

| 파일 | 상태 |
|---|---|
| `circuits/insurance_eligibility/src/main.nr` | 완성 — `assert(risk_score >= threshold)` 회로 |
| `circuits/insurance_eligibility/target/insurance_eligibility.json` | 완성 — 컴파일된 회로 아티팩트 (1.7KB) |
| `circuits/insurance_eligibility/target/proof` | 완성 — `nargo prove` 로컬 생성 proof (14KB) |
| `zkp-prover-wasm/src/main.rs` | 완성 — HMAC-SHA256 커밋먼트 회로, 유닛 테스트 5/5 |
| `zkp-prover-wasm/dist/zkp-prover.wasm` | 완성 — wasm32-wasip2 릴리즈 빌드 (137KB) |
| `src/lib/zkp/prover.ts` | **완료** — IronClaw Tool Call API 호출로 교체 |
| `src/lib/zkp/verifier.ts` | **완료** — SHA-256 proof hash 계산 + 온체인 조회 |

#### 구현 태스크

- [x] Barretenberg 대신 HMAC-SHA256 커밋먼트 기반 ZKP 회로 구현 (`zkp-prover-wasm`)
- [x] wasm32-wasip2 타깃 빌드 성공 (137KB) — 유닛 테스트 5/5 통과
- [ ] IronClaw에 `zkp-prover` WASM 툴 등록 (수동 — `zkp-prover-wasm/REGISTER.md` 참조)
- [x] `src/lib/zkp/prover.ts` — IronClaw Tool Call API(`zkp_prove`) 호출로 교체, 더미 코드 제거
- [x] `src/lib/zkp/verifier.ts` — SHA-256 proof hash 계산 + `isProofRegisteredOnChain` 유지
- [x] `src/actions/runAnalysis.ts` — `verifyZkpProof` + `submitProofHashOnChain` 파이프라인 통합
- [x] TypeScript 타입 오류 0건 확인
- [ ] E2E 검증: WASM 툴 등록 후 IronClaw Tool Call → proof bytes 수신 → 온체인 등록 (WASM 툴 등록 후)

> **Phase 3 업그레이드 경로**: Aztec Protocol NEAR 호환 ultraplonk verifier 출시 시
> HMAC-SHA256 커밋먼트 → Barretenberg ultraplonk proof로 동일 인터페이스 교체

---

### Stage 17 — IronClaw v0.28.x 재검증 기반 완전 격리 파이프라인 [재검토]

> **목적**: IronClaw v0.28.x 계열에서 재확인할 인프라 장벽을 바탕으로, 실제 유전자 파일이
> TEE 외부로 단 한 바이트도 노출되지 않는 완전 격리 파이프라인을 완성한다.
> Stage 16의 HMAC-SHA256 커밋먼트를 Barretenberg ultraplonk proof로 교체하고,
> 파일 전송 암호화(ECIES)를 추가하여 Phase 0의 Mock 구조를 모두 제거한다.
>
> **전제 조건(업데이트 2026-05-27)**: 로컬 CLI는 v0.26.0, 공개 확인 최신 릴리스는 v0.28.2. v0.26.0 최신 전제는 폐기하고 v0.28.2에서 WASM 등록/실행/결과 반환 경로를 재검증한다. v0.29.0/PR #3122는 공개 근거 확인 전까지 후보로만 관리한다.
> **참고 명세**: `docs/03_Technical_Specs/ZKP_IN_TEE_WASM_IMPL_SPEC.md`

#### IronClaw 릴리스 업데이트에서 재검증할 장벽 요약

| 장벽 | 4월 기준 가정 | 2026-05-27 업데이트 판단 |
|---|---|---|
| 커스텀 WASM 툴 배포 | v0.25.0부터 프로덕션, v0.26.0 보안 강화 | v0.28.0 WIT-compatible WASM runtime 기준으로 재실측 |
| 호스티드 TEE WASM 크리덴셜 인젝션 | v0.26.0 완전 해결 가정 | v0.27.0 path-based credentials는 보조 신호. TEE 내부 복호화 API를 대체한다고 단정 불가 |
| 파일 첨부/API 파이프라인 | v0.26.0 attachment/document upload 추가 | 파일 전달과 TEE 내부 복호화는 분리 검증 필요 |
| WASM 툴 설치 경로 | local install과 cloud 반영 경로 불명확 | v0.28.2 chat-driven `tool_install` 복원으로 재검증 |
| WASM 실행 결과 반환 | Chat tool call 결과가 입력 인자만 반환 | v0.28.0 WIT runtime에서 tool result 반환 경로 실측 필요 |
| TEE 샌드박스 격리 | 프로젝트별 독립 샌드박스 | v0.28.1 multi-tenant memory isolation/headless WASM 채널 반영 여부 확인 |

#### 17-1. Barretenberg WASM 크기 검증 및 빌드

> Stage 16에서 크기 제한 우려로 HMAC-SHA256 커밋먼트로 대체했으나,
> v0.28.2 기준에서도 WASM 툴 크기 제한이 명시적으로 문서화되지 않아 실측 필요.

- [ ] Barretenberg 소스코드 클론 (`AztecProtocol/barretenberg`)
- [ ] `wasm32-wasip2` 타깃 크로스 컴파일
  ```bash
  cargo build --target wasm32-wasip2 --release
  ```
- [ ] 빌드 결과 크기 측정 (예상 ~50MB+)
- [ ] IronClaw v0.28.2 WASM 툴 크기 제한 실측
  ```bash
  near-ai agent upload --tool barretenberg.wasm --name zkp-prover --version 0.1.0
  # 크기 초과 시 에러 메시지로 제한치 확인
  ```
- [ ] 크기 초과 시: `wasm-opt -Oz` 최적화 + `wasm-strip` 심볼 제거 후 재측정
- [ ] `prove`, `verify` 함수 export 정상 동작 확인

#### 17-2. 실제 파일 → TEE 암호화 전송 파이프라인

> Phase 0에서 파일 원본을 서버에 전송하지 않고 SHA-256 해시만 사용했던 구조를
> ECIES 암호화 기반 TEE 직전송으로 교체.

- [ ] `src/lib/tee/attestation.ts` — TEE 공개키 조회 로직 추가
  - [ ] `fetchTeePublicKey()` — `/v1/attestation/report`에서 `signing_key` 추출
- [ ] `src/lib/tee/encryption.ts` 신규 작성
  - [ ] `encryptForTee(fileBuffer, teePublicKey)` — ECIES + AES-256-GCM 암호화
  - [ ] 브라우저 Web Crypto API 기반 구현
- [ ] `src/components/modules/FileUploadZone.tsx` 수정
  - [ ] 파일 원본 읽기 → TEE Attestation 확인 → ECIES 암호화 → 암호화 데이터 서버 전송
  - [ ] SHA-256 해시는 무결성 검증용으로 병행 유지
- [ ] `src/actions/runAnalysis.ts` 수정
  - [ ] `parseMockFile()` 호출 제거
  - [ ] 암호화된 파일 데이터를 IronClaw TEE API로 전달

#### 17-3. Barretenberg WASM → IronClaw 등록 및 prover.ts 교체

> Stage 16의 HMAC-SHA256 커밋먼트(`zkp-prover-wasm`)를 Barretenberg ultraplonk으로 교체.
> Barretenberg 크기 검증(17-1) 통과 후 착수.

- [ ] IronClaw WASM 툴 등록
  ```bash
  near-ai agent upload --tool barretenberg.wasm --name zkp-prover --version 1.0.0
  near-ai agent upload --file insurance_eligibility.json --name zkp-circuit
  ```
- [ ] `src/lib/zkp/prover.ts` — Barretenberg Tool Call로 교체
  ```typescript
  const response = await ironclawClient.tools.call({
    tool: "zkp-prover",
    function: "prove",
    inputs: {
      circuit: "insurance_eligibility",
      private_inputs: { risk_score: input.riskScore },
      public_inputs: { threshold: input.threshold },
    },
  });
  ```
- [ ] `src/lib/zkp/verifier.ts` — ultraplonk proof 검증으로 교체
- [ ] `src/actions/runAnalysis.ts` — `parseMockFile()` 완전 제거, 실제 TEE 분석 결과 사용

#### 17-4. 완전 격리 파이프라인 E2E 검증

- [ ] 실제 유전자 파일 업로드 → ECIES 암호화 → TEE 전송 → 복호화 분석 → proof 생성 → 소각
- [ ] `risk_score`가 TEE 외부 로그 어디에도 노출되지 않음을 확인
- [ ] `nargo verify` 로컬 검증과 TEE 생성 proof 결과 일치 확인
- [ ] 온체인 proof hash 등록 (`zkp.rogulus.testnet`) 확인
- [ ] Intel TDX Attestation 배지 정상 표시 확인

#### 17-5. Phase 0 Mock 코드 완전 제거

- [ ] `src/lib/tee/mock-tee.ts` 삭제 (또는 테스트 전용으로 이동)
- [ ] `src/lib/tee/mock-data.ts` 삭제
- [ ] `src/actions/runAnalysis.ts` — `USE_REAL_TEE` 환경 변수 분기 제거 (항상 실제 TEE)
- [ ] `npm run build` TypeScript 오류 0건 확인

> **Barretenberg 크기 제한 초과 시 대안**: 17-1에서 크기 초과가 확인되면
> Stage 16의 HMAC-SHA256 구조를 유지하되, 17-2(파일 암호화 전송)와
> 17-4(E2E 검증)만 진행하여 파이프라인 완성도를 높인다.

---

### Stage 18 — Phase 3: 완전 격리 TEE 파이프라인 완성 [구현 예정]

> **목적**: 유전자 파일 파싱 / ZKP proof 생성 / risk_score 도출을 모두 IronClaw TEE 안으로 이동.
> Stage 17에서 구현된 파일 전달 파이프라인 위에 TEE 복호화와 WASM 툴 실행을 추가.
>
> **선행 조건**: IronClaw v0.28.2 재검증 및 NEAR AI 팀 문의 응답 — 블로커 1~3 해소 후 착수
> **참고 문서**: `docs/03_Technical_Specs/PHASE3_BLOCKERS_AND_INQUIRY.md`

---

#### 18-1. NEAR AI 팀 문의 및 블로커 해소 [Q2 2026]

- [ ] IronClaw v0.28.2 기준 로컬 CLI/API 업그레이드 테스트
- [ ] v0.28.0 WIT-compatible WASM runtime에서 `zkp-prover.wasm` 실행 결과 반환 여부 확인
- [ ] v0.28.2 chat-driven `tool_install`이 cloud.near.ai hosted TEE까지 반영되는지 확인
- [ ] `PHASE3_BLOCKERS_AND_INQUIRY.md` 문의 메일 발송 (team@near.ai 또는 Discord)
- [ ] 블로커 1 해소: TEE 내부 ECIES 복호화 API 엔드포인트 확인
- [ ] 블로커 2 해소: cloud.near.ai 사용자 정의 WASM 툴 등록 절차 확인
- [ ] 블로커 3 해소: WASM 툴 실행 결과 반환 API 또는 Mission API 확인
- [ ] 블로커 5 해소: IronClaw Cloud TEE WASM 툴 최대 크기 확인

---

#### 18-2. ECIES 암호화 실제 적용 [Q2 2026, 블로커 1 해소 후]

> Stage 17에서 `encryption.ts`와 `FileUploadZone` base64 전달까지 구현 완료.
> 이 단계에서 실제 ECIES 암호화를 적용하고 TEE 내부 복호화를 연결.

- [ ] `FileUploadZone.tsx` 수정
  - [ ] 파일 base64 저장 → ECIES 암호화 후 저장으로 교체
  - [ ] `verifyAttestation()`에서 `signing_public_key` 조회 후 `encryptForTee()` 호출
  - [ ] 암호화 성공 여부 UI 표시 ("파일이 TEE 공개키로 암호화되었습니다")
- [ ] `runAnalysis.ts` 수정
  - [ ] `parseGeneticFile()` 제거 — 복호화는 TEE 내부에서 처리
  - [ ] 암호화된 파일 bytes를 IronClaw API로 직접 전달
- [ ] TEE 내부 복호화 동작 E2E 검증

---

#### 18-3. 파일 파싱 WASM 툴 TEE 등록 [Q2 2026, 블로커 2 해소 후]

- [ ] `file-parser.wasm` 신규 작성 (wasm32-wasip2)
  - [ ] 입력: ECIES 복호화된 유전자 파일 bytes
  - [ ] 출력: `NormalizedGeneticProfile` JSON
  - [ ] 지원 포맷: `.txt` (젠톡), `.vcf`, `.csv`
- [ ] `cargo build --target wasm32-wasip2 --release`
- [ ] cloud.near.ai에 `file-parser` WASM 툴 등록
- [ ] IronClaw 분석 프롬프트에 `file-parser` 툴 호출 통합

---

#### 18-4. ZKP Prover WASM 툴 TEE 등록 [Q2 2026, 블로커 2·3 해소 후]

- [ ] `zkp-prover.wasm` (137KB, 기존 빌드 완료) cloud.near.ai 등록
- [ ] IronClaw WASM 툴 실행 결과 반환 경로 확인 및 `prover.ts` 수정
  - [ ] wasmtime 서브프로세스 방식 → Cloud TEE Tool Execution API 방식으로 교체
  - [ ] `risk_score`가 TEE 외부 로그에 노출되지 않음 확인
- [ ] `USE_REAL_ZKP` 분기 제거 — Cloud TEE 경로만 유지
- [ ] E2E: 파일 → TEE 복호화 → 분석 → ZKP 생성 → proof bytes 반환

---

#### 18-5. Barretenberg ultraplonk 교체 [Q3 2026]

> 현재 HMAC-SHA256 커밋먼트 → 수학적으로 검증 가능한 ultraplonk ZKP로 교체.
> Aztec Protocol 팀 협력 또는 공식 NEAR 호환 라이브러리 출시 후 착수.

- [ ] Barretenberg 소스 클론 (`AztecProtocol/barretenberg`)
- [ ] `wasm32-wasip2` 타깃 크로스 컴파일
- [ ] IronClaw Cloud TEE WASM 크기 제한 실측 후 등록 가능 여부 판단
  - [ ] 가능 시: cloud.near.ai에 `barretenberg.wasm` 등록
  - [ ] 불가 시: `wasm-opt -Oz` 최적화 + 분할 등록 시도
- [ ] `zkp.rogulus.testnet` 컨트랙트 — `verify_proof_onchain()` 추가 (ultraplonk verifier)
- [ ] E2E: ultraplonk proof 생성 → 온체인 수학적 검증

---

#### 18-6. Confidential Intents SDK 실연동 [Q3 2026]

> Stage 10에서 near-api-js v7 충돌로 보류. SDK 업데이트 후 착수.

- [ ] `@defuse-protocol/intents-sdk` v7 대응 버전 출시 확인
- [ ] SDK 설치 및 `chain-signatures.ts` 교체
  - [ ] `Transfer` 액션 → `IntentsClient.submitIntent()` 호출
  - [ ] ZKP proof hash를 intent calldata에 첨부
- [ ] Defuse Protocol Solver 네트워크 실연동 E2E 검증
- [ ] `next.config.ts` CSP — Defuse Protocol 엔드포인트 추가

---

#### 18-7. Mock 코드 완전 제거 [Q3 2026, 18-2~18-4 완료 후]

- [ ] `src/lib/tee/mock-tee.ts` 삭제
- [ ] `src/lib/tee/mock-data.ts` 삭제
- [ ] `src/actions/runAnalysis.ts` — `USE_REAL_TEE` 분기 제거 (항상 실제 TEE)
- [ ] `src/lib/tee/normalizer.ts` — `parseMockFile()` 제거
- [ ] `npm run build` TypeScript 오류 0건 확인

---

#### 18-8. 외부 보안 감사 [Q3 2026]

- [ ] 스마트 컨트랙트 감사 (`zkp.rogulus.testnet`)
- [ ] ECIES 암호화 구현 감사 (`encryption.ts`)
- [ ] TEE Attestation 검증 로직 감사 (`attestation.ts`)
- [ ] IDOR, CSRF, 인젝션 취약점 재점검 (`SECURITY_CHECKLIST.md` v2.0)
- [ ] 유전자 데이터 완전 격리 검증 보고서 작성

---

#### 18-9. 정식 서비스 런칭 준비 [Q4 2026]

- [ ] Confidential Intents 메인넷 전환 (엔드포인트 변경)
- [ ] 보험사 B2B API 연동 (`B2B_BROKER_CONCEPT.md` 참조)
- [ ] 규제 샌드박스 신청 (국내 금융당국)
- [ ] 법률 자문 수령 — 유전자 정보 활용 서비스 규제 프레임 확인
- [ ] 베타 서비스 운영 (초대 기반, 100명 이내)

---

#### 18-10. 글로벌 확장 [Q1 2027]

- [ ] 싱가포르, 유럽 시장 진출 준비 (PDPA, GDPR 대응)
- [ ] Chain Abstraction 멀티체인 통합 (ETH, SOL 보험료 결제)
- [ ] 토큰 이코노미 설계 및 데이터 리워드 모델 적용
- [ ] Chain Signatures v2 — SOL 파생 주소 실연동

---

#### Stage 18 예상 일정 요약

| 단계 | 항목 | 예상 시기 | 선행 조건 |
|---|---|---|---|
| 18-1 | IronClaw v0.28.2 재검증 + NEAR AI 문의 보강 | 2026-05 | 공개 릴리스 확인 |
| 18-2 | ECIES 실제 적용 | 2026-05~06 | 블로커 1 해소 |
| 18-3 | 파일 파싱 WASM TEE 등록 | 2026-06 | 블로커 2 해소 |
| 18-4 | ZKP Prover TEE 등록 | 2026-06 | 블로커 2·3 해소 |
| 18-5 | Barretenberg 교체 | 2026-07~08 | 블로커 5 해소 |
| 18-6 | Confidential Intents + USDC 실연동 | 2026-08 | SDK/API/엔드포인트 실측 |
| 18-7 | Mock 코드 제거 | 2026-08 | 18-2~18-4 완료 |
| 18-8 | 외부 보안 감사 | 2026-09 | 18-7 완료 |
| 18-9 | 정식 서비스 런칭 | 2026-10~12 | 18-8 완료 |
| 18-10 | 글로벌 확장 | 2027-01~ | 18-9 완료 |

---

## Related Documents
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [TEE Attestation 구현 명세](../03_Technical_Specs/TEE_ATTESTATION_SPEC.md)
- [Phase 2 구현 명세서](../03_Technical_Specs/PHASE2_IMPLEMENTATION_SPEC.md)
- [AI 상담 레이어 구현 명세](../03_Technical_Specs/SECRET_KEEPER_IMPL_SPEC.md)
- [ZKP-in-TEE WASM 배포 구현 명세](../03_Technical_Specs/ZKP_IN_TEE_WASM_IMPL_SPEC.md)
- [DB 스키마 명세](../03_Technical_Specs/DB_SCHEMA.md)
- [보험상품 데이터 수집 파이프라인](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md)
- [보험상품 데이터 정기 갱신 QA](../05_QA_Validation/03_INSURANCE_DATA_REFRESH_QA.md)
- [보험 카탈로그 DB Migration 0004/0005 검증](../05_QA_Validation/09_DB_MIGRATION_0004_0005_2026_05_28.md)
- [Source-aware Seed 정책 검증](../05_QA_Validation/10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md)
- [Source-aware Seed DB 적용 검증](../05_QA_Validation/11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md)
- [보험료 Quote Matrix 재조회 PoC](../05_QA_Validation/12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md)
- [보험료 Quote Schema Migration 검증](../05_QA_Validation/13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md)
- [보험료 Quote DB Migration 0006 적용 검증](../05_QA_Validation/14_PREMIUM_QUOTES_DB_APPLY_2026_05_28.md)
- [PR Review Operating Checklist](../05_QA_Validation/16_PR_REVIEW_OPERATING_CHECKLIST_2026_05_28.md)
- [실손의료보험 여성 Quote 파라미터 검증](../05_QA_Validation/17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md)
- [Quote-only Source Catalog DB 적용 검증](../05_QA_Validation/19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md)
- [Quote-only Source 공식 문서 Probe 검증](../05_QA_Validation/20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md)
- [KDB/신한 Source 문서 Variant 재검수](../05_QA_Validation/26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md)
- [KDB Source Document Seed 후보 추가 검증](../05_QA_Validation/27_KDB_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_30.md)
- [KDB Source Document DB 적용 검증](../05_QA_Validation/28_KDB_SOURCE_DOCUMENTS_DB_APPLY_2026_05_30.md)
- [신한라이프 일반형 공식 문서 Endpoint 탐색](../05_QA_Validation/29_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_PROBE_2026_05_30.md)
- [신한라이프 일반형 공식 문서 Endpoint 재탐색](../05_QA_Validation/45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md)
- [실손의료보험 Baseline 매칭 키워드 검수](../05_QA_Validation/46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md)
- [실손의료보험 Baseline 추천 Snapshot Seed 검증](../05_QA_Validation/47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md)
- [실손의료보험 Baseline 추천 Snapshot DB 적용 검증](../05_QA_Validation/48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md)
- [실손의료보험 Baseline 남성 Quote ID 교정 검증](../05_QA_Validation/49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md)
- [실손의료보험 Baseline 남성 Quote DB 적용 검증](../05_QA_Validation/50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md)
- [실손의료보험 조건별 Quote UI 표시 검증](../05_QA_Validation/51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md)
- [삼성화재 실손의료보험 상품 전용 문서 재탐색](../05_QA_Validation/53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md)
- [삼성화재 실손 Baseline 추천 Snapshot Seed 검증](../05_QA_Validation/54_SAMSUNG_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md)
- [삼성화재 실손 Baseline 추천 Snapshot DB 적용 검증](../05_QA_Validation/55_SAMSUNG_FIRE_BASELINE_DB_APPLY_2026_05_31.md)
- [남은 Source 후보 처리 순서 검증](../05_QA_Validation/56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md)
- [신한라이프 해약환급금 미지급형 암보험 매칭 키워드 검증](../05_QA_Validation/57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md)
- [신한라이프 해약환급금 미지급형 추천 Snapshot Seed 검증](../05_QA_Validation/58_SHINHAN_NO_REFUND_SNAPSHOT_SEED_2026_05_31.md)
- [신한라이프 해약환급금 미지급형 추천 Snapshot DB 적용 검증](../05_QA_Validation/59_SHINHAN_NO_REFUND_DB_APPLY_2026_05_31.md)
- [남은 Raw Source 공식 문서 Probe 검증](../05_QA_Validation/60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md)
- [농협손보 공시 Adapter Probe 검증](../05_QA_Validation/61_NH_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md)
- [농협손보 실손의료보험 Baseline 매칭 검수](../05_QA_Validation/62_NH_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md)
- [데모 보험상품 운영 추천 제거 검증](../05_QA_Validation/33_DEMO_INSURANCE_PRODUCTS_RETIREMENT_2026_05_30.md)
- [데모 보험상품 Archive DB 적용 검증](../05_QA_Validation/34_DEMO_PRODUCTS_ARCHIVE_DB_APPLY_2026_05_30.md)
- [보험상품 매칭 키워드 정리 정책](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md)
- [AI 매칭 파이프라인](./AI_MATCHING_PIPELINE.md)
- [두 기둥 기반 서비스 업데이트 계획](./03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md)
- [조건별 보험료 Quote Matrix 관리 방침](./04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md)
- [The Secret Keeper 추천상품 컨텍스트 주입 설계](../03_Technical_Specs/05_CONCIERGE_PRODUCT_CONTEXT_SPEC_2026_05_31.md)
- [구현 계획 (초기 세팅)](./IMPLEMENTATION_PLAN.md)
