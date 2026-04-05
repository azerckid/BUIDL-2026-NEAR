# [로드맵] 유전자 기반 AI 보험 설계 프로젝트 추진 일정

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-05 (Stage 9 DNA 배경·ZKP 터미널 로그·네비게이션 완료)
- **레이어**: 04_Logic_Progress
- **상태**: Draft v2.0

---

## 1. 마일스톤 요약 (Milestone Summary)

### Phase 0: 해커톤 데모 (NEAR Buidl 2006)
- **기간**: 2026-04-01 ~ 2026-04-20 (해커톤 제출 데드라인 기준)
- **목표**: 심사위원에게 핵심 가치 전달 가능한 인터랙티브 데모 완성.
- **산출물**:
  - Next.js 기반 웹 DApp — 5단계 User Flow UI 구현 (Step 1~5 화면 전환).
  - NEAR Testnet 지갑 연결 및 더미 보험 카탈로그 조회 동작.
  - TEE 분석 시뮬레이션 UI (실제 IronClaw 대신 Mock 응답으로 대체).
  - Confidential Intents Testnet에서의 더미 결제 트랜잭션 데모.
- **데모 발표 포인트**: TEE 분석 → Memory Purge 애니메이션 → ZKP 증명 → 기밀 결제 흐름을 한 번에 보여주는 5분 시연 시나리오.

### Phase 1: MVP 개발 및 개념 증명 (PoC)
- **텔레그램 에이전트와 웹 DApp의 관계**: Phase 1에서는 텔레그램 봇을 빠른 프로토타입 채널로 활용. 사용자가 DTC 결과 텍스트를 텔레그램에 붙여넣으면 AI가 요약 리포트를 반환하는 방식으로 분석 로직(AI 모델 + 보험 매칭 엔진)을 먼저 검증. **Phase 2 이전에 동일한 분석 백엔드를 웹 DApp으로 전환**하며, 텔레그램 봇은 알림/리밸런싱 알람 채널로 역할 축소.
- NEAR Protocol 기반의 기본 계정 및 프라이빗 스토리지 연동.
- 기존 보험 증권 분석을 통한 보장 공백 진단 로직 구현.

### Phase 2: NEAR TEE 및 프라이버시 스택 통합
- NEAR AI 프라이버시 스택을 활용한 TEE 분석 환경 구축.
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
| **2026-04** | 해커톤 데모 완성 (Phase 0) — Next.js UI, Testnet 연동, Mock TEE | 3주 |
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
| IronClaw TEE 개발 환경 구축 난이도 | 높음 | 중간 | Phase 0~1에서는 Mock TEE(로컬 Node.js 함수)로 대체. Phase 2에 NEAR AI 팀과 기술 지원 요청. |
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
- 참고: nargo compile/prove/verify는 Phase 2에서 수행 (Vercel 환경 CLI 미지원)

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
- [x] `src/lib/near/chain-signatures.ts` — Phase 0 Mock 구현 (2초 지연 + NEAR base58 44자 txHash 생성)
- [ ] `v1.signer` MPC 컨트랙트 testnet 실연동 — Phase 2 예정 (`multichain-testnet.near`)
- [ ] `deriveAddress` 함수 — NEAR 계정 기반 파생 키 생성 — Phase 2 예정
- [ ] `requestSignature` 함수 — MPC 서명 요청 — Phase 2 예정
- [ ] Phase 3 준비: 타 체인(ETH/SOL) 파생 주소 생성 함수 분리 설계

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
- [ ] NEAR Explorer 링크 — Phase 2 예정 (testnet explorer URL 확정 후 적용)

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
- [x] `Dockerfile` + `.dockerignore` 작성 (nargo CLI 포함, next.config.ts standalone 설정)
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
- [ ] `v1.signer` MPC 컨트랙트 testnet 서명 요청 실동작 확인
- [ ] Chain Signatures 파생 키(Derived Key) 생성 동작 확인
- [ ] MPC 서명 → 트랜잭션 브로드캐스트 전체 흐름 E2E 확인
- [ ] Phase 3 대비: ETH/SOL 파생 주소 생성 함수 동작 확인 (브로드캐스트는 미구현)

#### 7-5. Noir ZKP 온체인 검증 연동 (Phase 2 준비)
- [ ] NEAR 스마트 컨트랙트에 Noir verifier 함수 추가 (`verify_proof(proof_bytes, public_inputs)`)
- [ ] testnet 컨트랙트 배포 + `nargo verify`와 온체인 검증 결과 일치 확인
- [ ] Phase 0 로컬 검증 → Phase 2 온체인 검증 전환 포인트 주석 표시

#### 7-6. E2E 검증
- [x] Mock 파일 → IronClaw API → `TeeAnalysisOutput` JSON 수신 확인
- [ ] Noir ZKP proof 생성 → proof bytes 포함 여부 확인
- [ ] Chain Signatures MPC 서명 → Confidential Intents 트랜잭션 제출 확인
- [ ] 전체 플로우 (업로드 → TEE → ZKP → 대시보드 → 서명 → 결제 완료) E2E 완주

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
- [ ] Lighthouse Performance 점수 70점 이상 (직접 측정 필요)
- [ ] Lighthouse Accessibility 점수 85점 이상 (직접 측정 필요)
- [ ] Turso DB 쿼리 응답 50ms 이내 확인 (직접 측정 필요)

#### 8-4. 데모 시나리오 검증
- [ ] `DEMO_SCENARIO.md` 기준 5분 시연 시나리오 처음부터 끝까지 막힘 없이 완주
- [x] Mock 파일(`mock_genome_gentok.txt`) → IronClaw TEE → 데이터 소각 동작 확인
- [ ] NEAR Testnet 지갑 연결 + 더미 트랜잭션 서명 최종 동작 확인
- [ ] Memory Purge 애니메이션 데모 시 정상 재생 확인

#### 8-5. 제출 패키지 준비
- [x] GitHub 레포지토리 정리 (README 해커톤용으로 교체, .env.example 작성 완료)
- [ ] 피치덱 (`PITCH_DECK.md`) 최종 검토
- [ ] 데모 영상 녹화 (`DEMO_SCENARIO.md` 씬 순서대로)
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

## 관련 문서
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [DB 스키마 명세](../03_Technical_Specs/DB_SCHEMA.md)
- [AI 매칭 파이프라인](./AI_MATCHING_PIPELINE.md)
- [구현 계획 (초기 세팅)](./IMPLEMENTATION_PLAN.md)
