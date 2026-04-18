# [로드맵] 유전자 기반 AI 보험 설계 프로젝트 추진 일정

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-19 (Stage 16 Phase 2 구현 완료)
- **레이어**: 04_Logic_Progress
- **상태**: Draft v2.1
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
- **Confidential Intents 실연동**: Defuse Protocol SDK를 통해 실제 기밀 결제 인텐트를 Solver 네트워크에 제출. ZKP proof hash를 calldata에 첨부.
- **Noir ZKP 온체인 수학적 검증**: `@aztec/bb.js` 기반 실제 proof 생성 및 NEAR 컨트랙트 제출.
- **MPC Chain Signatures 고도화**: v1.signer 실연동으로 NEAR 지갑 하나로 ETH/SOL 보험료 결제 지원.
- **NEAR AI Cloud 연동 고도화**: Qwen 30B 이상 모델 활용, TEE 내부 분석 정확도 향상.
- **AI 상담 레이어 추가 (부가 기능)**: TEE 분석 후 생성된 위험 레이블을 컨텍스트로 주입하여, 사용자가 보험·질병 관련 질문을 할 수 있는 채팅 인터페이스 제공. LLM 내장 지식 기반 답변, Stateless 설계. 세부 구현 명세는 `SECRET_KEEPER_IMPL_SPEC.md` 참조.
- 암호화된 유전자 Raw Data(VCF 등)의 안전한 로딩 및 처리 테스트.
- 보험사 API 연동 및 상품 매칭 엔진 고도화.
- Confidential Intents 테스트넷 → 메인넷 전환 대응.

### Phase 3: 정식 서비스 런칭 및 생태계 확장
- Confidential Intents 메인넷을 활용한 실제 보험 계약 및 결제 시스템 통합.
- 데이터 리워드(Data Rewards) 및 토크노믹스 모델 적용.
- 국내외 대형 보험사와의 파트너십 확장 및 규제 샌드박스 신청.
- Chain Abstraction을 통한 멀티체인 보험 상품 통합.

---

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

## 관련 문서
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [TEE Attestation 구현 명세](../03_Technical_Specs/TEE_ATTESTATION_SPEC.md)
- [Phase 2 구현 명세서](../03_Technical_Specs/PHASE2_IMPLEMENTATION_SPEC.md)
- [AI 상담 레이어 구현 명세](../03_Technical_Specs/SECRET_KEEPER_IMPL_SPEC.md)
- [ZKP-in-TEE WASM 배포 구현 명세](../03_Technical_Specs/ZKP_IN_TEE_WASM_IMPL_SPEC.md)
- [DB 스키마 명세](../03_Technical_Specs/DB_SCHEMA.md)
- [AI 매칭 파이프라인](./AI_MATCHING_PIPELINE.md)
- [구현 계획 (초기 세팅)](./IMPLEMENTATION_PLAN.md)
