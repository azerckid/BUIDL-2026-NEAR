# [보안 검증] 유전자 정보 취급 및 NEAR 프라이버시 스택 체크리스트

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-10
- **레이어**: 05_QA_Validation
- **상태**: Draft v1.2

---

## 1. 데이터 저장 및 주권 (Data Storage & Sovereignty)
- [ ] 유전자 Raw Data가 NEAR Private Cloud에 ECIES + AES-256-GCM으로 암호화되어 저장되는가?
- [ ] 사용자 본인 외에 그 누구도 스토리지에 접근할 수 없는 키 관리 구조인가?
- [ ] 데이터 소유자가 자신의 데이터를 즉시 삭제(Right to be forgotten)할 수 있는가?
- [ ] Turso DB에 유전자 원본 데이터 또는 부분 수치가 단 한 건도 저장되지 않는가?
- [ ] 업로드 파일 형식이 화이트리스트(VCF, PDF, TXT)로만 제한되어 있는가?

---

## 2. 신뢰 실행 환경 (TEE) 분석 보안 — IronClaw Agentic Harness
- [ ] AI 모델 분석이 가상 메모리가 아닌 하드웨어 격리 인클레이브(IronClaw TEE)에서 수행되며, 검증 가능한 Attestation이 제공되는가?
- [ ] TEE 내부로 데이터가 전달될 때 전송 구간 암호화(TLS 1.3)가 보장되는가?
- [ ] 분석 종료 후 TEE 내부의 모든 휘발성 메모리가 즉시 초기화되는가?
- [ ] TEE 분석 타임아웃(60초) 발생 시 세션이 강제 종료되고 중간 데이터가 소각되는가?
- [ ] TEE 내부 오류(ENCLAVE_ERROR) 발생 시 Emergency Purge가 실행되는가?
- [ ] 외부 도구 호출이 WebAssembly(WASM) 컨테이너 내 능력 기반(capability-based) 권한 모델로 격리 실행되고, 네트워크 요청이 승인된 엔드포인트 화이트리스트로만 제한되는가?
- [ ] API 키 등 자격증명이 AES-256-GCM 암호화 금고에 보관되며 외부 도구에 직접 노출되지 않고 런타임 시점에만 주입되는가?
- [ ] 프롬프트 인젝션(Prompt Injection) 공격에 대해 IronClaw 내장 패턴 감지 및 콘텐츠 살균 레이어가 활성화되어 있는가?

---

## 3. Noir ZKP 증명 및 결과 전달 보안
- [ ] Noir 회로의 private input(`risk_score`)이 IronClaw TEE 외부로 절대 노출되지 않는가?
- [ ] `circuits/insurance_eligibility/src/main.nr` 회로 로직이 `assert(risk_score >= threshold)` 단일 조건으로 제한되는가?
- [ ] `nargo compile` 아티팩트가 버전 관리되고 변조 불가 상태로 유지되는가?
- [ ] ZKP proof 생성이 IronClaw TEE 내부(`prover.ts`)에서만 호출되는가?
- [ ] proof bytes 외 수치 데이터가 `TeeAnalysisOutput`에 포함되지 않는가?
- [ ] ZKP proof bytes가 Confidential Intents 트랜잭션 calldata에 첨부되는가?
- [ ] Phase 0 로컬 검증(`nargo verify`)이 통과되는가?
- [ ] Phase 2 전환 시 NEAR 스마트 컨트랙트 온체인 verifier 함수가 동일 proof를 검증하는가?
- [ ] 분석 결과 리포트가 사용자 본인에게만 암호화되어 전달되는가?
- [ ] 보험사로 전달되는 데이터가 proof bytes + 상품 코드만 포함하는가? (수치 미포함)
- [ ] ZKP proof 생성 실패 시 결제 플로우가 진행 불가 상태로 차단되는가?

## 3-1. Chain Signatures 보안
- [ ] `v1.signer` MPC 컨트랙트 호출 시 서명 요청 payload에 민감 데이터가 포함되지 않는가?
- [ ] 파생 키(Derived Key) 생성 path가 사용자 계정별 고유하게 분리되는가?
- [ ] MPC 서명 응답 검증 후에만 트랜잭션 브로드캐스트가 진행되는가?
- [ ] Chain Signatures 서명 요청이 사용자 명시적 승인(Wallet Selector 팝업) 없이 자동 실행되지 않는가?
- [ ] Confidential Intents를 통해 거래 증명이 안전하게 온체인에 기록되는가?
- [ ] 거래 실패 시 결제 금액이 즉시 온체인 revert되고 보험사로 데이터 미전송이 보장되는가?

---

## 4. 웹 프론트엔드 보안 (Web Security)
- [ ] Next.js `Content-Security-Policy(CSP)` 헤더가 설정되어 인라인 스크립트 및 외부 스크립트 로드를 제한하는가?
- [ ] 모든 API 라우트에 CSRF 방어 토큰 또는 SameSite 쿠키 정책이 적용되어 있는가?
- [ ] 사용자 입력값(파일명, 지갑 주소 등) 전체에 XSS 방어를 위한 인코딩/이스케이프 처리가 되어 있는가?
- [ ] 파일 업로드 엔드포인트에서 허용 MIME 타입 외 파일의 서버 실행이 불가능한가?
- [ ] Drizzle ORM의 Parameterized Query를 사용하여 SQL Injection이 방어되어 있는가?
- [ ] `next.config.js`의 `headers()`에 `X-Frame-Options: DENY` 및 `X-Content-Type-Options: nosniff`가 설정되어 있는가?
- [ ] 환경 변수(API 키, DB 토큰)가 클라이언트 번들에 노출되지 않는가? (`NEXT_PUBLIC_` 접두사 사용 여부 점검)

---

## 5. 스마트 컨트랙트 보안 (Smart Contract Security)
- [ ] 보험료 결제 컨트랙트에 재진입 공격(Re-entrancy Attack) 방어 로직이 구현되어 있는가?
- [ ] 수수료 정산 함수의 호출자 권한 검증(Access Control)이 되어 있는가? (플랫폼 트레저리 주소만 허용)
- [ ] NEAR 컨트랙트의 `ft_on_transfer` 콜백에서 잘못된 토큰 수신 시 즉시 revert 처리가 되는가?
- [ ] 정수 오버플로우 방지를 위해 안전한 산술 연산(NEAR SDK의 u128 타입 등)을 사용하는가?
- [ ] 컨트랙트 배포 전 외부 보안 감사(Audit) 또는 자동화 스캐너(cargo-near-audit 등) 실행 계획이 있는가?
- [ ] 컨트랙트 업그레이드 권한이 멀티시그(Multi-sig) 또는 DAO 거버넌스로 통제되는가?

---

## 6. 유전자 정보 특화 규제 준수 (Genetic Data Compliance)
- [ ] **한국 생명윤리법 (생명윤리 및 안전에 관한 법률 제50조)**: 유전자 검사를 위탁하는 경우 보건복지부 인정 기관에 위탁 여부 확인. 자체 분석(AI 해석)이 '유전자 검사'에 해당하는지 법률 자문 수령.
- [ ] **한국 개인정보보호법 제23조**: 유전자 정보는 민감정보에 해당. 수집 및 처리 시 별도 동의 획득 절차가 구현되어 있는가?
- [ ] **EU GDPR Article 9**: 유전 정보(genetic data)는 특수 범주 개인정보. EU 서비스 시 처리 근거(명시적 동의 또는 공중 보건 목적) 문서화 여부.
- [ ] **미국 GINA (Genetic Information Nondiscrimination Act)**: 미국 서비스 확장 시 유전자 정보 기반 보험 차별 금지 조항 준수 여부 검토.
- [ ] 개인정보 처리방침에 유전자 정보의 보유 기간, 파기 방법, 제3자 제공 여부가 명시되어 있는가?
- [ ] 사용자의 데이터 열람/수정/삭제 요청(DSAR, Data Subject Access Request)을 처리하는 절차가 구현되어 있는가?

---

## 7. 일반 규제 준수 (General Compliance)
- [ ] 각 국가의 개인정보보호법(GDPR, 한국 개인정보보호법 등)을 준수하는가?
- [ ] 불필요한 개인 식별 정보(PII)의 수집을 최소화하고 있는가? (지갑 주소만을 식별자로 사용)
- [ ] 국내 보험업법상 보험중개 서비스 운영에 필요한 GA 등록 또는 제휴 계획이 수립되어 있는가?

---

## 8. 성능 및 가용성 검증 (Performance & Availability)

### 8-1. TEE 분석 처리 성능
- [ ] TEE 분석 평균 처리 시간이 30초 이내인가? (목표 기준: P95 < 45초)

### 8-2. DB 응답 성능
- [ ] Turso Edge DB 쿼리 응답 시간이 50ms 이내인가? (보험 카탈로그 조회 기준, 직접 측정 필요)

### 8-3. 가용성 및 부하
- [ ] 동시 분석 요청 10건 이상 발생 시 큐(Queue) 처리 또는 대기 상태 UI가 구현되어 있는가?
- [ ] NEAR 네트워크 지연/장애 발생 시 서비스 부분 동작(보험 카탈로그 열람 등) 또는 Graceful Degradation이 가능한가?

### 8-4. Lighthouse 측정 결과

#### Vercel 프로덕션 URL 기준 (최종, 2026-04-10)

| 항목 | 점수 | 목표 | 결과 |
|---|---|---|---|
| Performance | **87** / 100 | 70 이상 | PASS |
| Accessibility | **100** / 100 | 85 이상 | PASS |
| Best Practices | **96** / 100 | — | — |
| SEO | **100** / 100 | — | — |

주요 지표: FCP 2.6s / TBT 230ms / LCP 4.2s

#### 참고: localhost production build 기준 (비교용)

| 페이지 | Performance | Accessibility | FCP | LCP | TBT |
|---|---|---|---|---|---|
| `/ko` (홈) | 55 / 100 | 100 / 100 | 17.6s | 20.3s | 0ms |
| `/ko/pitch` | 62 / 100 | 89 / 100 | 5.3s | 8.1s | 0ms |

- localhost와 Vercel CDN 간 Performance 32점 차이는 CDN 엣지 캐싱·압축 효과

---

## 관련 문서
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [프로토타입 UI 흐름](../02_UI_Screens/USER_FLOW.md)
- [프로젝트 로드맵](../04_Logic_Progress/ROADMAP.md)
