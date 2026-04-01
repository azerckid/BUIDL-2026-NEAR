# [보안 검증] 유전자 정보 취급 및 NEAR 프라이버시 스택 체크리스트

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-01
- **레이어**: 05_QA_Validation
- **상태**: Draft v1.1

---

## 1. 데이터 저장 및 주권 (Data Storage & Sovereignty)
- [ ] 유전자 Raw Data가 NEAR Private Cloud에 ECIES + AES-256-GCM으로 암호화되어 저장되는가?
- [ ] 사용자 본인 외에 그 누구도 스토리지에 접근할 수 없는 키 관리 구조인가?
- [ ] 데이터 소유자가 자신의 데이터를 즉시 삭제(Right to be forgotten)할 수 있는가?
- [ ] Turso DB에 유전자 원본 데이터 또는 부분 수치가 단 한 건도 저장되지 않는가?
- [ ] 업로드 파일 형식이 화이트리스트(VCF, PDF, TXT)로만 제한되어 있는가?

---

## 2. 신뢰 실행 환경 (TEE) 분석 보안
- [ ] AI 모델 분석이 가상 메모리가 아닌 하드웨어 격리 영역(IronClaw TEE)에서 수행되는가?
- [ ] TEE 내부로 데이터가 전달될 때 전송 구간 암호화(TLS 1.3)가 보장되는가?
- [ ] 분석 종료 후 TEE 내부의 모든 휘발성 메모리가 즉시 초기화되는가?
- [ ] TEE 분석 타임아웃(60초) 발생 시 세션이 강제 종료되고 중간 데이터가 소각되는가?
- [ ] TEE 내부 오류(ENCLAVE_ERROR) 발생 시 Emergency Purge가 실행되는가?

---

## 3. ZKP 증명 및 결과 전달 보안
- [ ] Noir 회로의 private input(실제 risk_score)이 TEE 외부로 절대 노출되지 않는가?
- [ ] ZKP 증명(proof bytes)의 유효성이 NEAR 스마트 컨트랙트 온체인에서 검증되는가?
- [ ] 분석 결과 리포트가 사용자 본인에게만 암호화되어 전달되는가?
- [ ] 보험사로 전달되는 데이터가 사용자의 상세 유전자 정보를 포함하지 않는가? (조건 충족 결과만 전달)
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
- [ ] TEE 분석 평균 처리 시간이 30초 이내인가? (목표 기준: P95 < 45초)
- [ ] Turso Edge DB 쿼리 응답 시간이 50ms 이내인가? (보험 카탈로그 조회 기준)
- [ ] 동시 분석 요청 10건 이상 발생 시 큐(Queue) 처리 또는 대기 상태 UI가 구현되어 있는가?
- [ ] NEAR 네트워크 지연/장애 발생 시 서비스 부분 동작(보험 카탈로그 열람 등) 또는 Graceful Degradation이 가능한가?
- [ ] Lighthouse 기준 Performance 점수 70점 이상, Accessibility 점수 85점 이상을 충족하는가?

---

## 관련 문서
- [기술 아키텍처 명세](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [프로토타입 UI 흐름](../02_UI_Screens/USER_FLOW.md)
- [프로젝트 로드맵](../04_Logic_Progress/ROADMAP.md)
