# [피치덱] MyDNA Insurance Agent — NEAR Buidl 2026

- **작성일**: 2026-04-01
- **최종 수정일**: 2026-04-06
- **레이어**: 01_Concept_Design
- **상태**: Final v2.0

---

## Slide 1 — Cover

**MyDNA Insurance Agent**

> 유전자를 노출하지 않고, 유전자 덕분에 더 나은 보험에 가입하는 유일한 방법.

- NEAR Buidl 2026 Hackathon
- Submission Deadline: 2026-04-20
- Live Demo: [배포 URL]
- GitHub: [레포지토리 URL]

---

## Slide 2 — Problem: 세 가지 공포

유전자 검사 결과를 보험에 연결하는 것은 현재 불가능하다. 이유는 세 가지다.

**1. 유전자 차별 (Genetic Discrimination)**
보험사는 유전자 원본을 받는 순간 리스크를 극대화하고 보장을 최소화하는 방향으로 활용한다. 개인이 태어날 때부터 갖고 있는 정보가 불이익의 근거가 된다.

**2. 데이터 주권 상실 (Loss of Data Sovereignty)**
기존 시스템에 유전자 원본을 제출하면 통제권을 영구히 잃는다. 23andMe는 2023년 1,400만 건의 유전자 데이터를 유출했다. 2025년에는 파산 후 데이터 자산이 경매에 부쳐졌다.

**3. 보장 불일치 (Coverage Mismatch)**
현재 보험 상품은 통계적 집단 평균에 기반한다. 개인의 특수한 유전적 취약점을 정밀하게 커버하는 상품은 존재하지 않는다.

**결과**: 전 세계 수천만 명이 유전자 검사 결과를 보유하고 있음에도 보험 최적화에 활용하지 못하고 서랍에 방치하고 있다.

---

## Slide 3 — Solution: 프라이버시 역설을 뒤집다

**"정보를 노출하지 않고, 정보 덕분에 혜택을 얻는다."**

MyDNA Insurance Agent는 NEAR Protocol의 2026 프라이버시 스택을 활용하여 세 가지 문제를 동시에 해결한다.

| 문제 | 해결 방법 |
|---|---|
| 유전자 차별 | ZKP(영지식 증명) — 보험사에 수치를 전달하지 않고 "조건 충족"만 증명 |
| 데이터 주권 상실 | IronClaw TEE — 분석 후 즉시 메모리 삭제. 운영자도 열람 불가 |
| 보장 불일치 | AI 에이전트 — 개인 유전자 프로파일 기반 핀포인트 보장 설계 |

보험사는 "유전자 A 조건을 충족한 사용자"라는 사실만 알 수 있다. 수치는 절대 전달되지 않는다.

---

## Slide 4 — Product: 5단계 사용자 여정

**Step 1 — 지갑 연결 (NEAR Wallet Selector)**

- **Web3 사용자**: NEAR Wallet Selector(MyNearWallet)로 즉시 연결.
- **Web2 일반 사용자**: FastAuth 기반 이메일 로그인 지원 (Phase 1 로드맵). 암호화폐 경험 없는 40대 보험 가입자도 진입 가능한 구조.
- 지갑 연결 시 사용자 프로파일 자동 생성 (Turso Edge DB).

**Step 2 — 유전자 데이터 업로드**

DTC 서비스(젠톡, 진스타일, 뱅크샐러드)에서 내보낸 Raw 파일(VCF, TXT, CSV, PDF)을 업로드한다. 파일은 브라우저에서 SHA-256 해시만 계산되며 서버에 원본이 전송되지 않는다. 드래그앤드롭 + 파일 잠금 애니메이션으로 "보안 처리 시작"을 직관적으로 전달한다.

**Step 3 — IronClaw TEE 격리 분석 (핵심 UX)**

NEAR AI Cloud의 IronClaw Runtime이 실제로 유전자 파일을 분석한다. Trusted Execution Environment 내부에서만 데이터가 복호화·처리되며, 분석 완료 즉시 메모리를 삭제한다.

- 5단계 진행 표시: 파싱 → TEE 분석 → ZKP 증명 생성 → 위험 프로파일 생성 → 데이터 소각
- 터미널 스타일 ZKP 흐름 로그: `[PRIVATE — not exposed to insurer]` 노란색 강조
- Memory Purge 파티클 애니메이션: 소각 완료를 시각적으로 확인
- Noir ZKP 회로 실행 → 증명 해시를 NEAR 스마트 컨트랙트(`zkp.rogulus.testnet`)에 온체인 등록

**Step 4 — AI 보험 추천 대시보드**

IronClaw가 생성한 위험 프로파일(종양·암 / 심혈관 / 대사 / 신경·뇌)을 기반으로 최적 보험 상품이 추천된다. ZKP 자격 증명이 확인된 사용자에게는 할인 뱃지가 자동 적용된다. 보험사에는 수치가 아닌 "해당 건강 지표 기준 충족" 여부만 전달된다.

**Step 5 — Confidential Intents 기밀 결제**

NEAR Testnet 실거래 트랜잭션으로 결제가 완료된다. Confidential Intent 구조(intent_type, zkp_proof_hash, product_ids)가 결제 화면에 시각화된다. 결제 완료 후 보험 가입 확인서(증서 번호, Tx Hash, NEAR Explorer 링크)가 발급된다.

---

## Slide 5 — What We Built (Phase 0 Demo)

> 해커톤 기간 내에 실제 작동하는 엔드-투-엔드 데모를 구현했다.

### 기술 구현 현황

| 레이어 | 구현 내용 | 상태 |
|---|---|---|
| **IronClaw TEE** | NEAR AI Cloud REST API 연동, Qwen3-30B 모델 기반 유전자 분석 | 실연동 완료 |
| **Noir ZKP 회로** | `insurance_eligibility` 회로 컴파일 + proof hash 생성 | 완료 |
| **온체인 ZKP 등록** | `zkp.rogulus.testnet` NEAR Rust 컨트랙트 배포 + proof hash 등록 | 완료 |
| **NEAR Testnet 트랜잭션** | MyNearWallet 서명 + 0.001 NEAR 실거래 + Explorer 링크 | 완료 |
| **Confidential Intent 패널** | intent 구조 시각화, `[PRIVATE]` 필드 구분 표시 | 완료 |
| **보험 가입 확인서** | 증서 번호, 가입일, ZKP 검증 뱃지, 인쇄 버튼 | 완료 |
| **데이터 영구 소각** | 분석 완료 후 DB에 유전자 원본 0바이트 저장 | 아키텍처 보장 |
| **다국어 지원** | 한국어 / 영어 실시간 전환 (next-intl) | 완료 |

### 기술 스택

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Shadcn/ui + Framer Motion + React Three Fiber
- **Backend**: Next.js Server Actions + Drizzle ORM + Turso (Edge SQLite)
- **Web3**: NEAR Protocol + near-api-js v7 + @near-wallet-selector + Noir ZKP
- **AI/TEE**: NEAR AI Cloud (IronClaw Runtime) + OpenAI-compatible REST API

---

## Slide 6 — Why NEAR, Why Now

NEAR Protocol의 세 기술이 **2026년 상반기에 동시에 가용**해진 시점이 이 서비스의 존재 조건이다. 2025년까지는 불가능했고, 다른 체인에서는 지금도 불가능하다.

**IronClaw Runtime**
하드웨어 TEE(신뢰 실행 환경) 내부에서 AI 에이전트를 격리 실행. 유전자 데이터 분석 후 즉시 소각. 서비스 운영자도 열람 불가. **MyDNA는 IronClaw의 첫 번째 소비자 향 B2C 레퍼런스다.**

**Confidential Intents** (2026.02 출시)
트랜잭션 상세가 퍼블릭 멤풀에 노출되지 않음. 보험 계약 내용이 온체인에 가려진 채로 결제가 확정됨. MEV/프런트러닝 원천 차단.

**Chain Signatures**
NEAR 계정 하나로 이더리움, 솔라나 등 타 체인의 보험 스마트 컨트랙트에 직접 서명. 체인 사일로에 갇혀 있던 글로벌 보험 유동성을 단일 플랫폼으로 통합 (Phase 2).

> "우리는 NEAR를 기록용 레이어로 쓰지 않는다. NEAR의 Privacy Compute, Private Settlement, Chain Abstraction을 유전자 보험이라는 가장 민감한 금융 서비스에 적용하는 첫 번째 프로젝트다."

**생태계 동반 성장 (Leverage)**

MyDNA의 성장은 세 개의 플라이휠을 동시에 구동한다.

- **NEAR 생태계**: 사용자 증가 → IronClaw·Confidential Intents 실사용 수요 창출 → NEAR의 "프라이버시 컴퓨팅 체인" 포지셔닝 강화.
- **글로벌 보험 유동성**: 플랫폼 성장 → 보험사의 NEAR 체인 상품 출시 수익성 검증 → MyDNA = 글로벌 보험 단일 진입점(Super-GA).
- **의료 데이터 산업**: 데이터 Pool 확대 → 제약사·연구소 데이터 구매 → 수익 70% 사용자 환원 → 자기 강화 루프.

---

## Slide 7 — Competitive Landscape

| 평가 기준 | 전통 GA (보맵 등) | Web3 보험 (Nexus Mutual 등) | DTC 유전자 (23andMe 등) | **MyDNA** |
|---|:---:|:---:|:---:|:---:|
| 유전자 기반 보험 추천 | X | X | △ | **O** |
| 유전자 원본 미보관 | X | X | X | **O** |
| 보험사에 수치 미공개 (ZKP) | X | X | X | **O** |
| 멀티체인 글로벌 상품 | X | △ | X | **O** |
| AI 자동 설계 | △ | X | X | **O** |
| 개인 건강보험 취급 | O | X | X | **O** |

**"대기업이 AWS Nitro TEE로 똑같이 만들면?" — 해자의 본질**

MyDNA의 해자는 TEE 단독이 아니다. **TEE(격리 분석) + NEAR Private Cloud(사용자 소유 스토리지) + 온체인 소각 증명(Trustless 검증)** 세 가지의 결합이다. AWS Nitro는 분석을 격리할 수 있지만 소각 증명을 퍼블릭 체인에 올릴 수 없다. 결국 "우리를 믿어달라"는 중앙화 신뢰 모델로 귀결된다. 유전자 데이터 서비스에서 "신뢰"와 "검증" 중 어느 쪽이 선택받는가는 자명하다.

---

## Slide 8 — Business Model

오프라인 GA 설계사 네트워크가 독점하던 중개 수수료를 AI와 스마트 컨트랙트로 대체한다.

### Revenue Stream 1 — 중개 수수료 (Core Cash Cow)
- 사용자가 AI 추천 보험을 결제하면 보험사로부터 초회 보험료의 **15%**를 수취.
- 월 보험료 10만 원 → 플랫폼 수익 1.5만 원.
- 인건비 0원 수렴. 기존 오프라인 GA 대비 폭발적 영업이익률.
- **초기 제휴 GTM**: 중소형 GA(독립대리점) 대상 화이트레이블 공급으로 초기 캐시플로우 확보. Q4 2026: 자체 GA 라이선스 독자 확보.

### Revenue Stream 2 — 우량 고객 리스크 할인 차익 (Arbitrage)
- 건강 관리가 입증된 사용자는 보험사 손해율이 낮은 초우량 고객군.
- B2B 도매가로 확보한 특판 상품을 소비자가에 큐레이션 판매. **마진 차액 수취**.

### Revenue Stream 3 — AI 구독 (Recurring Revenue)
- 월 4,900원. 유전자 프로파일과 신규 보험 상품을 실시간 대조하여 리밸런싱 추천.
- 예측 가능한 반복 수익 기반.

### Revenue Stream 4 — 데이터 리워드 (Data-to-Earn, Phase 3)
- 익명화 통계 데이터 제공 동의 시 NEAR 토큰 보상.
- 제약/연구 기관 데이터 구매 대금의 70%를 사용자에게 환원.

---

## Slide 9 — Market Size

| 구분 | 정의 | 규모 |
|---|---|---|
| **TAM** | 글로벌 생명/건강보험 시장 + DTC 유전자 검사 시장 | ~$4.5조 |
| **SAM** | 유전자 검사 경험 보유 MZ 세대 디지털 보험 시장 (한국/싱가포르/EU) | ~$180억 |
| **SOM** | 3년 내 확보 목표 — DTC 제휴(뱅크샐러드 등) 통한 10만 사용자 | ~$4,500만 |

> 출처: 금융감독원 2025 보험업 연간 보고서 / Grand View Research DTC Genetic Testing Market Report 2025

**국내 시장 진입 근거**
- 국내 DTC 유전자 검사 사용자 수: 연간 급성장세 (젠톡, 진스타일, 뱅크샐러드 합산)
- MZ 세대의 보험 디지털 채널 전환율 가속화
- 뱅크샐러드 무료 검사 이벤트 등 유전자 검사 대중화 진입점 확보 용이

---

## Slide 10 — Roadmap

| Phase | 기간 | 목표 | 주요 산출물 |
|---|---|---|---|
| **Phase 0** ✅ | 2026-04 (3주) | 해커톤 데모 완성 | Next.js DApp, IronClaw TEE 실연동, NEAR Testnet 실거래, Noir ZKP 온체인 등록, 보험 가입 확인서 |
| **Phase 1** | Q2 2026 (3개월) | MVP / PoC | Confidential Intents SDK 실연동, DTC API 제휴, 보험 매칭 엔진 고도화 |
| **Phase 2** | Q3 2026 (2개월) | 실연동 고도화 | Chain Signatures MPC 멀티체인, Noir 온체인 수학적 검증, 보안 감사 |
| **Phase 3** | Q4 2026 ~ Q1 2027 | 정식 런칭 | GA 라이선스 확보, Confidential Intents 메인넷 전환, 토크노믹스 |

**Phase 0에서 검증한 핵심 가설**
- IronClaw TEE가 실제 유전자 분석을 격리 수행하고 결과만 반환하는가 → **검증 완료**
- Noir ZKP 증명이 NEAR 스마트 컨트랙트에 온체인 등록되는가 → **검증 완료**
- NEAR Testnet에서 실거래 트랜잭션 서명 및 확정이 가능한가 → **검증 완료**

---

## Slide 11 — Team

**솔로 파운더 — 1인 풀스택 해커톤 빌드**

| 역할 | 내용 |
|---|---|
| Product & Strategy | 비즈니스 기획, 사용자 여정 설계, 해커톤 시연 시나리오 |
| Full-Stack Development | Next.js 16 DApp, Server Actions, Drizzle ORM, Turso DB |
| Web3 Integration | NEAR 지갑 연동, Chain Signatures, Noir ZKP 회로, NEAR Rust 스마트 컨트랙트 배포 |
| AI/TEE Integration | IronClaw Runtime REST 연동, 유전자 분석 프롬프트 설계, TEE 소각 파이프라인 |
| Design | 디자인 시스템, Framer Motion 애니메이션, React Three Fiber 3D DNA 배경 |

> Phase 1 이후: AI/백엔드 개발자 1명, 디자이너 1명 합류 계획. 보험 도메인 자문 GA 파트너 협의 중.

---

## Slide 12 — Ask / Why This Matters

**해커톤에서 검증하고자 했던 것 — 그리고 검증한 것**

| 가설 | 검증 결과 |
|---|---|
| IronClaw + Confidential Intents로 "밀실 연산 → 기밀 결제" 엔드-투-엔드 구현 가능한가 | **완료** — 실제 동작하는 데모 |
| 15% 중개 수수료 모델이 오프라인 GA를 대체하는 실질적 사업성을 설득할 수 있는가 | 해커톤 심사로 검증 중 |

**NEAR 생태계 기여**

- **오픈소스 헌납**: TEE-App 래퍼 구조 + 보험 제출용 Noir ZKP 회로 템플릿을 오픈소스로 공개. 헬스케어 빌더가 NEAR에서 프라이버시 DApp을 10분 내 구축 가능한 인프라.
- **기술 스택 통합 레퍼런스**: IronClaw + Confidential Intents + Chain Signatures를 단일 B2C 서비스로 엮은 첫 번째 실제 사용 사례.
- **비전 증명**: "User-Owned AI"가 유전자 보험이라는 가장 현실적인 금융 서비스 위에서 어떻게 작동하는지 구체적 제품으로 증명.

**이 플랫폼이 구동하는 세 개의 플라이휠**

| 플라이휠 | 파급 대상 | 메커니즘 |
|---|---|---|
| NEAR 생태계 | NEAR Protocol, 검증자, 개발자 | MyDNA 성장 → IronClaw·Confidential Intents 수요 → 프라이버시 DApp 생태계 가속 |
| 글로벌 보험 유동성 | 국내외 보험사, Web3 보험 프로토콜 | 플랫폼 성장 → 보험사 NEAR 진입 → MyDNA = 글로벌 보험 단일 진입점 |
| 의료 데이터 산업 | 제약사, 연구소, 사용자 | 데이터 Pool 확대 → 수익 70% 사용자 환원 → 자기 강화 루프 |

> 규제 강화는 오히려 해자(Moat)를 높인다. 중앙화 경쟁자들은 데이터 보관 자체가 불법이 되지만, MyDNA는 애초에 데이터를 보관하지 않는 구조이므로 규제 강화 시 유일한 합법 대안이 된다.

---

## 관련 문서

- [비즈니스 기획안](./GENETIC_AI_INSURANCE_AGENT.md)
- [수익 모델 상세](./MONEY_FLOW.md)
- [경쟁 분석](./COMPETITIVE_ANALYSIS.md)
- [생태계 파급력 전략](./VISION_CORE_LEVERAGE.md)
- [사용자 플로우](../02_UI_Screens/USER_FLOW.md)
- [기술 아키텍처](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [NEAR 기술 스택](../03_Technical_Specs/LATEST_NEAR_TECH_STACK.md)
- [로드맵](../04_Logic_Progress/ROADMAP.md)
