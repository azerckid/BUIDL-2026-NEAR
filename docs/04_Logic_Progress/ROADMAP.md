# [로드맵] 유전자 기반 AI 보험 설계 프로젝트 추진 일정

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-03
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
- [ ] `npx create-next-app@latest` 실행 (typescript, tailwind, eslint, app router, src-dir, import-alias)
- [ ] `npx shadcn@latest init` 실행 — 다크 테마, zinc 기반 CSS 변수 선택
- [ ] Shadcn 컴포넌트 추가: `button card dialog progress alert badge table tabs toast sonner`

#### 1-2. 패키지 설치
- [ ] 애니메이션: `framer-motion`
- [ ] 날짜/시간: `luxon`, `@types/luxon`
- [ ] 국제화: `next-intl`
- [ ] DB: `drizzle-orm`, `@libsql/client`, `drizzle-kit`, `dotenv`
- [ ] Web3: `near-api-js`, `@nearai/client`
- [ ] NEAR Wallet: `@near-wallet-selector/core`, `@near-wallet-selector/my-near-wallet`, `@near-wallet-selector/modal-ui`
- [ ] 폼 검증: `zod`, `react-hook-form`, `@hookform/resolvers`
- [ ] 유틸: `uuid`, `@types/uuid`
- [ ] 폰트: `@fontsource/pretendard`

#### 1-3. 환경 변수 및 설정 파일
- [ ] `.env.local` 생성 — `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEAR_WALLET_NETWORK`, `NEARAI_API_KEY`
- [ ] `drizzle.config.ts` 생성 — SQLite dialect, schema 경로 설정
- [ ] `next.config.ts` — 보안 헤더 설정 (`X-Frame-Options`, `X-Content-Type-Options`, `CSP`)

#### 1-4. Turso DB 초기화
- [ ] Turso CLI 설치 및 `turso auth login`
- [ ] `turso db create mydna-local` 실행
- [ ] `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` `.env.local`에 기입

#### 1-5. DB 스키마 및 마이그레이션
- [ ] `src/lib/db/schema.ts` 작성 — `DB_SCHEMA.md` 기준 6개 테이블 전체
  - [ ] `user_profiles`
  - [ ] `analysis_sessions`
  - [ ] `analysis_results`
  - [ ] `insurance_products`
  - [ ] `insurance_applications`
  - [ ] `platform_earnings`
- [ ] `npx drizzle-kit generate` 실행
- [ ] `npx drizzle-kit migrate` 실행
- [ ] `src/lib/db/seed.ts` 작성 — 5종 보험 상품 시드 데이터
- [ ] `npx tsx src/lib/db/seed.ts` 실행

#### 1-6. 디자인 시스템 및 디렉토리 구조
- [ ] `src/app/globals.css` — `DESIGN_SYSTEM_SHADCN.md` 기준 CSS 변수 적용 (bg-zinc-950, Electric Blue, Emerald Purge 색상)
- [ ] `src/app/layout.tsx` — Inter + Pretendard 폰트, 전역 메타데이터
- [ ] 디렉토리 구조 생성: `components/modules/`, `lib/near/`, `lib/tee/`, `actions/`, `types/`, `messages/`
- [ ] `public/mock/mock_genome_gentok.txt` 배치 — `AI_MATCHING_PIPELINE.md` 7절 스펙 기준

#### 1-7. 초기 세팅 검증
- [ ] `npm run dev` → `localhost:3000` 다크 테마 화면 정상 표시
- [ ] `npx drizzle-kit studio` → 5종 시드 상품 DB 확인

---

### Stage 2 — 랜딩 + NEAR 지갑 연결 (User Flow Step 1)

#### 2-1. NEAR Wallet 연동
- [ ] `src/lib/near/wallet.ts` — NEAR Wallet Selector 초기화 (testnet, MyNearWallet)
- [ ] Wallet Selector Modal UI 스타일 오버라이드 (다크 테마 일치)
- [ ] 지갑 연결 상태 전역 관리 (React Context)

#### 2-2. 랜딩 페이지 UI
- [ ] `src/app/page.tsx` — 히어로 섹션 (타이틀, 서브카피, CTA 버튼)
- [ ] `src/components/modules/WalletConnect.tsx` — 지갑 연결/해제 버튼 컴포넌트
- [ ] 지갑 연결 전/후 상태별 UI 분기 (미연결: 연결 버튼 / 연결됨: 주소 표시 + 다음 단계 버튼)
- [ ] 지갑 주소 축약 표시 (앞 6자 + ... + 뒤 4자)

#### 2-3. DB 연동
- [ ] `src/actions/upsertUserProfile.ts` — 지갑 주소 기반 `user_profiles` upsert Server Action
- [ ] 지갑 연결 성공 시 Server Action 호출

#### 2-4. 검증
- [ ] NEAR Testnet 지갑 연결 → 주소 표시 정상 동작
- [ ] DB에 `user_profiles` 레코드 생성 확인

---

### Stage 3 — 파일 업로드 (User Flow Step 2)

#### 3-1. 업로드 UI
- [ ] `src/components/modules/FileUploadZone.tsx` — 드래그앤드롭 영역 컴포넌트
- [ ] 파일 선택 버튼 + 드래그앤드롭 이벤트 처리
- [ ] 데모용 Mock 파일 자동 선택 버튼 ("샘플 파일로 체험하기")
- [ ] 업로드된 파일명, 크기 표시

#### 3-2. 파일 검증 (Zod)
- [ ] 허용 MIME 타입 화이트리스트 검증: `text/plain`, `text/csv`, `application/pdf`, `chemical/x-vcf`
- [ ] 파일 크기 상한 검증: 5MB 초과 시 에러 메시지
- [ ] 확장자 이중 검증 (.vcf, .csv, .pdf, .txt)

#### 3-3. 애니메이션
- [ ] 파일 검증 통과 시 자물쇠 잠김 Framer Motion 애니메이션
- [ ] 업로드 진행 Progress Bar

#### 3-4. DB 연동 및 전환
- [ ] `src/actions/createSession.ts` — `analysis_sessions` 레코드 생성 Server Action (`status: 'uploading'`)
- [ ] 업로드 완료 → Step 3 화면으로 전환

---

### Stage 4 — Mock TEE 분석 + Noir ZKP + Memory Purge 애니메이션 (User Flow Step 3)

#### 4-1. 타입 정의
- [ ] `src/types/genetic.ts` — `NormalizedGeneticProfile` 타입 + Zod 스키마
- [ ] `src/types/tee-output.ts` — `TeeAnalysisOutput` 타입 + `teeAnalysisOutputSchema` Zod 스키마 (`zkpProof` 필드 포함)

#### 4-2. 파이프라인 로직
- [ ] `src/lib/tee/normalizer.ts` — Stage 1 파싱 및 정규화 구현
  - [ ] `.txt` 젠톡 포맷 파서
  - [ ] 텍스트 레이블 → RiskLevel 변환 (`high / moderate / normal`)
  - [ ] VCF 수치 → RiskLevel 변환 (`scoreToLevel`)
- [ ] `src/lib/tee/mock-tee.ts` — Mock TEE 함수 구현 (`AI_MATCHING_PIPELINE.md` 5절 코드 기준)
  - [ ] `runMockTeeAnalysis` 함수 (2초 지연 시뮬레이션)
  - [ ] `buildPriorityOrder` 함수
  - [ ] `buildAdvisoryMessages` 함수
- [ ] `src/actions/matchProducts.ts` — DB 상품 매칭 Server Action
- [ ] `src/actions/runAnalysis.ts` — 전체 파이프라인 Server Action (Stage 1 → Mock TEE → **Noir ZKP** → Zod 검증 → 상품 매칭 → DB 저장)

#### 4-3. Noir ZKP 회로 구현 (신규)
- [ ] `nargo` CLI 설치 (`curl -L https://noirup.dev | bash && noirup`)
- [ ] `circuits/insurance_eligibility/` 디렉토리 생성 + `nargo init`
- [ ] `circuits/insurance_eligibility/src/main.nr` 회로 작성
  - [ ] `private input: risk_score: u8` — TEE 내부에서만 접근, 외부 절대 미노출
  - [ ] `public input: threshold: u8` — 보험사 공개 기준값
  - [ ] `assert(risk_score >= threshold)` — 자격 충족 여부만 증명, 수치 미노출
- [ ] `nargo compile` → `circuits/insurance_eligibility/target/` 아티팩트 생성
- [ ] `nargo prove` → 더미 입력으로 proof 생성 동작 확인
- [ ] `nargo verify` → proof 검증 동작 확인
- [ ] `src/lib/zkp/prover.ts` — Noir proof 생성 래퍼 함수 (TEE 내부에서 호출)
- [ ] `src/lib/zkp/verifier.ts` — proof 검증 래퍼 함수 (Phase 0: 로컬 검증, Phase 2: NEAR 온체인 검증)
- [ ] `src/types/zkp.ts` — `ZkpProof` 타입 정의 (proof bytes, publicInputs, verificationKey)
- [ ] `runAnalysis.ts` ZKP 단계 추가: TEE 출력 → `prover.ts` 호출 → proof bytes → DB 저장
- [ ] Phase 0에서 ZKP proof를 `analysis_results` DB에 저장 (온체인 검증은 Phase 2)

#### 4-4. 분석 진행 UI
- [ ] `src/components/modules/TeeAnalysisProgress.tsx` — 단계별 Progress 컴포넌트
- [ ] 5단계 상태 표시: `파일 파싱 중` → `TEE 분석 중` → `ZKP 증명 생성 중` → `위험 프로파일 생성` → `데이터 소각 완료`
- [ ] Memory Purge 파티클 애니메이션 (Framer Motion — 초록 파티클이 흩어지는 효과)
- [ ] 소각 완료 메시지: "유전자 원본 데이터가 안전하게 소각되었습니다"
- [ ] ZKP 완료 표시: "자격 증명 생성 완료 — 수치는 보험사에 전달되지 않습니다"

#### 4-5. 에러 처리
- [ ] 파이프라인 실패 시 에러 상태 UI 표시
- [ ] 타임아웃(60초) 발생 시 세션 강제 종료 및 에러 안내
- [ ] Noir proof 생성 실패 시 에러 메시지: "보험사 전달 증명 생성 실패 — 분석 재실행 필요"

#### 4-6. 전환
- [ ] 분석 완료 → `analysis_sessions.status = 'completed'` 업데이트
- [ ] Step 4 대시보드로 자동 전환

---

### Stage 5 — 보험 추천 대시보드 (User Flow Step 4)

#### 5-1. 대시보드 페이지
- [ ] `src/app/dashboard/page.tsx` — 대시보드 기본 레이아웃
- [ ] `analysis_results` DB에서 결과 조회 Server Action
- [ ] 보장 공백 요약 배너 (`coverageGapSummary` 표시)

#### 5-2. 위험 프로파일 카드
- [ ] `src/components/modules/RiskProfileCard.tsx` — 4개 카테고리별 위험 수준 표시
- [ ] 수준별 색상 구분: `high → red-500`, `moderate → yellow-500`, `normal → emerald-500`
- [ ] 카테고리별 어드바이저리 메시지 표시 (`advisoryMessages`)

#### 5-3. 보험 상품 카드
- [ ] `src/components/modules/InsuranceProductCard.tsx` — 상품 카드 UI
- [ ] 상품명, 보험사, 월 보험료, 주요 보장 내용 표시
- [ ] AI 추천 이유 표시 (어떤 유전자 위험 항목과 매칭되었는지)
- [ ] 상품 선택 체크박스 + 선택 상태 강조 효과

#### 5-4. 우선순위 탭 및 AI 근거
- [ ] `priorityOrder` 기반 탭 UI (높은 위험 카테고리 탭 우선 표시)
- [ ] AI 추론 요약 섹션 (`reasoning` 필드 표시)
- [ ] 선택 상품 소계 + 결제 진행 버튼

#### 5-5. 전환
- [ ] 결제 진행 버튼 → Step 5 결제 Dialog 오픈

---

### Stage 6 — Confidential Intents + Chain Signatures 결제 플로우 (User Flow Step 5)

#### 6-1. 결제 Dialog
- [ ] `src/components/modules/ConfidentialCheckout.tsx` — 결제 확인 모달 (Shadcn Dialog)
- [ ] 선택 상품 목록, 총 보험료 요약 표시
- [ ] "기밀 결제 (Confidential Intents)" 설명 문구
- [ ] "ZKP 증명 첨부됨 — 유전자 수치는 보험사에 전달되지 않습니다" 배지 표시

#### 6-2. Chain Signatures 연동 (신규)
- [ ] `src/lib/near/chain-signatures.ts` — Chain Signatures 래퍼 함수 작성
  - [ ] `v1.signer` MPC 컨트랙트 testnet 설정 (`multichain-testnet.near`)
  - [ ] `deriveAddress` 함수 — NEAR 계정 기반 파생 키 생성
  - [ ] `requestSignature` 함수 — MPC 서명 요청
- [ ] 결제 트랜잭션 구성 시 Chain Signatures MPC 서명 플로우 적용
- [ ] 결제 UI에 "Chain Signatures로 서명됨" 표시
- [ ] Phase 0: NEAR → NEAR 테스트넷 내 서명 시연 (단일 체인)
- [ ] Phase 3 준비: 타 체인(ETH/SOL) 파생 주소 생성 함수 분리 설계

#### 6-3. Confidential Intents + ZKP proof 결합
- [ ] Noir ZKP proof bytes를 Confidential Intents 트랜잭션 calldata에 첨부
- [ ] 트랜잭션 구성: `{ proof: zkpProofBytes, productIds: [...], premium: amount }`
- [ ] NEAR Testnet Confidential Intents 엔드포인트 설정 (Private Shards testnet)
- [ ] 트랜잭션 서명 → 제출 → 컨트랙트 검증 단계별 Progress 표시

#### 6-4. 결제 완료 처리
- [ ] 트랜잭션 해시 표시
- [ ] `insurance_applications` DB 레코드 생성 (`status: 'confirmed'`, `zkpProofRef` 저장)
- [ ] `platform_earnings` 수수료 레코드 생성 (15% 기준)
- [ ] 완료 화면 — 축하 메시지 + 트랜잭션 해시 링크 (NEAR Explorer)
- [ ] "보험사에 전달된 정보: 자격 충족 여부만 (유전자 수치 미포함)" 요약 표시

#### 6-5. 에러 처리
- [ ] 트랜잭션 실패 시 에러 메시지 + 재시도 버튼
- [ ] 사용자 서명 거부 시 모달 닫기 처리
- [ ] ZKP proof 첨부 실패 시 "증명 없는 결제 불가" 안내

---

### Stage 7 — IronClaw 실제 연동

#### 7-1. NEAR AI Cloud 설정
- [ ] NEAR AI Cloud 계정 생성 (Starter tier — 무료)
- [ ] `NEARAI_API_KEY` 발급 및 `.env.local` 기입
- [ ] IronClaw Agent 인스턴스 생성 (NEAR AI Cloud 콘솔)

#### 7-2. IronClaw 연동 레이어 작성
- [ ] `src/lib/tee/ironclaw-tee.ts` 작성 — `@nearai/client` 기반 실제 API 호출
  - [ ] `runIronClawAnalysis` 함수 — Mock TEE와 동일한 입출력 인터페이스
  - [ ] System Prompt + User Context Prompt 주입 (`AI_MATCHING_PIPELINE.md` 3절 기준)
  - [ ] 응답 JSON 파싱 + `teeAnalysisOutputSchema` Zod 검증
- [ ] `src/actions/runAnalysis.ts` 수정 — 환경 변수(`USE_REAL_TEE=true`) 기반 Mock/Real 분기

#### 7-3. 자격증명 및 보안 설정
- [ ] `NEARAI_API_KEY` 서버 사이드 전용 환경 변수 확인 (`NEXT_PUBLIC_` 접두사 미사용)
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
- [ ] Mock 파일 → IronClaw API → `TeeAnalysisOutput` JSON 수신 확인
- [ ] Noir ZKP proof 생성 → proof bytes 포함 여부 확인
- [ ] Chain Signatures MPC 서명 → Confidential Intents 트랜잭션 제출 확인
- [ ] 전체 플로우 (업로드 → TEE → ZKP → 대시보드 → 서명 → 결제 완료) E2E 완주

---

### Stage 8 — QA + 데모 준비

#### 8-1. 코드 품질
- [ ] `console.log` 전체 제거
- [ ] TypeScript 엄격 모드(`strict: true`) 오류 0건
- [ ] 사용하지 않는 import 제거
- [ ] `NEXT_PUBLIC_` 접두사 환경 변수 노출 여부 전수 점검

#### 8-2. 보안 체크리스트 검토
- [ ] `SECURITY_CHECKLIST.md` 전 항목 검토 및 통과 확인
- [ ] CSP, X-Frame-Options, X-Content-Type-Options 헤더 적용 확인
- [ ] Turso DB에 유전자 원본 데이터 저장 여부 확인 (카테고리 레벨만 저장)
- [ ] 파일 업로드 MIME 타입 화이트리스트 동작 확인

#### 8-3. 성능 및 접근성
- [ ] Lighthouse Performance 점수 70점 이상
- [ ] Lighthouse Accessibility 점수 85점 이상
- [ ] Turso DB 쿼리 응답 50ms 이내 확인

#### 8-4. 데모 시나리오 검증
- [ ] `DEMO_SCENARIO.md` 기준 5분 시연 시나리오 처음부터 끝까지 막힘 없이 완주
- [ ] Mock 파일(`mock_genome_gentok.txt`) → End-to-End 전체 플로우 동작 확인
- [ ] NEAR Testnet 지갑 연결 + 더미 트랜잭션 서명 최종 동작 확인
- [ ] Memory Purge 애니메이션 데모 시 정상 재생 확인

#### 8-5. 제출 패키지 준비
- [ ] GitHub 레포지토리 정리 (README, .env.example 작성)
- [ ] 피치덱 (`PITCH_DECK.md`) 최종 검토
- [ ] 데모 영상 녹화 (`DEMO_SCENARIO.md` 씬 순서대로)
- [ ] 해커톤 제출 폼 작성 (GitHub URL, 데모 영상 URL, 피치덱)

---

## 관련 문서
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [DB 스키마 명세](../03_Technical_Specs/DB_SCHEMA.md)
- [AI 매칭 파이프라인](./AI_MATCHING_PIPELINE.md)
- [구현 계획 (초기 세팅)](./IMPLEMENTATION_PLAN.md)
