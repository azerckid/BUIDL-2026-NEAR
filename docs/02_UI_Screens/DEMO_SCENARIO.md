# [데모 시나리오] MyDNA Insurance Agent — 해커톤 발표용 영상 스크립트

- **작성일**: 2026-04-01
- **최종 수정일**: 2026-04-01
- **레이어**: 02_UI_Screens
- **상태**: Draft v1.0

---

## 개요

**목표**: 심사위원이 "TEE 격리 분석 → Memory Purge → ZKP 기밀 결제"의 흐름을 단 한 번의 영상으로 이해하게 만든다.

**총 목표 시간**: 90초 ~ 120초 (피치덱 발표 중 재생 기준)

**화면 해상도**: 1920 × 1080 (16:9), 다크 테마 (`bg-zinc-950`)

**내레이션 방식**: 자막(한국어) + 영어 병기 자막. 목소리 내레이션은 선택 사항.

---

## 영상 구조 (씬 구성)

| 씬 | 화면 | 소요 시간 | 핵심 메시지 |
|---|---|---|---|
| Intro | 타이틀 카드 | 5초 | 서비스 이름 + 슬로건 |
| Scene 1 | Step 1 — 온보딩 | 15초 | 지갑 연결, 프라이버시 서약 |
| Scene 2 | Step 2 — 데이터 업로드 | 15초 | 파일 → 개인 금고 암호화 |
| Scene 3 | Step 3 — TEE 분석 + Purge | 25초 | 핵심 장면: 격리 분석 + 데이터 소각 |
| Scene 4 | Step 4 — 추천 대시보드 | 20초 | 유전자 기반 맞춤 보험 추천 |
| Scene 5 | Step 5 — 기밀 결제 | 15초 | 수치 미전송, 승인만 전달 |
| Outro | 메시지 카드 | 5초 | NEAR 기술 3종 + 포지셔닝 |

---

## 씬별 상세 스크립트

---

### [Intro] — 0:00 ~ 0:05

**화면 구성**
- 검은 배경에 중앙 정렬 타이포그래피
- 서비스명 `MyDNA Insurance Agent` fade-in (0.6초)
- 슬로건 한 줄 아래 slide-up (0.4초 딜레이)

**화면 텍스트**
```
MyDNA Insurance Agent

유전자를 노출하지 않고, 유전자 덕분에 더 나은 보험에 가입하는 유일한 방법.
The only way to get better insurance because of your DNA — without exposing it.
```

**전환**: 페이드 아웃 → Scene 1

---

### [Scene 1] 온보딩 — 0:05 ~ 0:20

**화면 구성**
- 랜딩 페이지 전체 화면 노출 (다크 배경, Electric Blue 포인트)
- 중앙에 히어로 타이틀: `"당신의 DNA는 당신만의 것입니다"`
- 하단에 `Connect Wallet` 버튼 (Primary Blue)
- 버튼 클릭 → NEAR Wallet 연결 모달 팝업 (300ms 이내)
- 지갑 선택 → 연결 완료 → 상단에 지갑 주소 `abcde...12345` 표시 (JetBrains Mono 폰트)

**내레이션 자막**
```
[KO] 회원가입 없이 NEAR 지갑만으로 시작합니다.
     서비스는 지갑 주소만 알 뿐, 개인 정보를 요구하지 않습니다.

[EN] No signup. Connect your NEAR wallet — that's all we know about you.
```

**애니메이션**
- 지갑 연결 성공 시: 랜딩 fade-out + 업로드 영역 slide-up (`duration: 0.4, ease: "easeOut"`)

**전환**: 슬라이드 업 → Scene 2

---

### [Scene 2] 데이터 업로드 — 0:20 ~ 0:35

**화면 구성**
- 화면 중앙: 점선 테두리 대형 드롭존 (`Card` 컴포넌트, dashed border, blue glow 펄스)
- 드롭존 내부 텍스트: `"유전자 검사 결과 파일을 여기에 드롭하세요 (VCF / PDF / TXT)"`
- 파일 드래그 진입 시: border glow 펄스 강화 (`repeat: Infinity, duration: 1.2`)
- 파일 드롭 → 파일명 표시 + 업로드 진행 바 (0 → 100%)
- 완료 시: 파일 아이콘 → 자물쇠 아이콘 morph + scale-down (`duration: 0.6, spring`)

**내레이션 자막**
```
[KO] DTC 유전자 서비스에서 내보낸 파일을 드롭합니다.
     파일은 즉시 암호화되어 당신의 개인 금고(NEAR Private Cloud)에만 저장됩니다.
     플랫폼 서버에는 원본이 존재하지 않습니다.

[EN] Drop your DTC genetic file. It's encrypted immediately and stored only in your
     personal vault on NEAR Private Cloud. Our servers never see the raw data.
```

**강조 UI 요소**
- 업로드 완료 후 드롭존 하단에 작은 텍스트로 표시:
  `"암호화 완료: ECIES + AES-256-GCM / 플랫폼 서버 저장: 없음"`

**전환**: 자물쇠 아이콘 잠김 → Scene 3

---

### [Scene 3] TEE 격리 분석 + Memory Purge ★ 핵심 장면 — 0:35 ~ 1:00

**화면 구성 (3단계로 분리)**

**3-A: TEE 진입 (5초)**
- 화면 전환: 배경에 스캔라인 이펙트 시작 (Y축 반복 이동, `duration: 2.0, linear`)
- 중앙에 Progress 바 + 단계 텍스트 순차 전환:
  ```
  [1/3] 하드웨어 보안 영역(TEE) 진입 중...
  ```
- 배경에 Skeleton UI가 깜빡이며 대시보드 윤곽을 암시

**3-B: 분석 진행 (10초)**
- Progress 바 40% → 80% 진행
- 단계 텍스트:
  ```
  [2/3] IronClaw Runtime에서 유전자 데이터 분석 중...
        (외부 접근 차단 — 운영자 포함 열람 불가)
  ```
- 우측 하단 작은 배지: `TEE Status: ACTIVE` (녹색 점 깜빡임)

**3-C: Memory Purge — 영상의 클라이맥스 (10초)**
- Progress 바 100% 도달
- 자물쇠 아이콘이 먼지 파티클로 해산하는 애니메이션 (`duration: 0.8, spring, bounce: 0.4`)
- 화면 전체가 0.3초간 emerald green 플래시
- 중앙에 대형 녹색 체크마크 팝인
- `Sonner` 토스트 팝업 (화면 우상단):
  ```
  원본 복호화 데이터가 TEE 영역에서 영구 소각되었습니다.
  Raw data permanently purged from TEE memory.
  ```
- 하단 소형 텍스트: `분석 소요: 18.3s / 잔류 데이터: 0 bytes`

**내레이션 자막**
```
[KO] 유전자 데이터는 하드웨어 TEE(신뢰 실행 환경) 안에서만 분석됩니다.
     분석이 끝나는 순간, 원본 데이터는 메모리에서 즉시 삭제됩니다.
     당사 서버 어디에도, 어느 직원도, 이 데이터를 본 사람은 없습니다.

[EN] Your DNA is analyzed only inside a hardware TEE (Trusted Execution Environment).
     The moment analysis is complete, raw data is permanently purged from memory.
     No one — including our engineers — ever sees it.
```

**전환**: 녹색 플래시 + 카드 stagger-in → Scene 4

---

### [Scene 4] AI 추천 대시보드 — 1:00 ~ 1:20

**화면 구성**
- 2컬럼 레이아웃:
  - 좌측: 유전자 취약점 리포트 (`Badge`, `Table`)
  - 우측: AI 추천 보험 특약 카드 목록 (`Card`, `Tabs`)

**좌측 리포트 예시 데이터**
```
[위험 항목]
- 췌장암 관련 유전자 변이 감지       [Badge: 고위험 / destructive]
- 당뇨병 2형 관련 지표 주의          [Badge: 주의 / warning]
- 심혈관 질환 지표 평균 범위          [Badge: 정상 / secondary]
```

**우측 추천 카드 예시 (Tabs: 내장기관 / 뇌혈관·심혈관 / 대사)**
```
[내장기관 탭]
Card 1: 췌장·간 집중 보장 특약
        월 보험료: 32,000원
        AI 추천 근거: "해당 유전자 지표 기준 충족"    ← 수치 미표시
        [장바구니 추가 버튼]

Card 2: 암 진단비 강화 특약
        월 보험료: 47,000원
        AI 추천 근거: "해당 유전자 지표 기준 충족"
        [장바구니 추가 버튼]
```

**내레이션 자막**
```
[KO] 분석 결과를 바탕으로 AI가 나의 유전적 취약점을 정밀 커버하는 특약 조합을 제안합니다.
     추천 근거에는 수치가 표시되지 않습니다. "해당 조건 충족"이라는 사실만 보입니다.

[EN] AI curates insurance products that precisely cover your genetic weak points.
     The recommendation shows only "condition met" — never the actual risk score.
```

**강조 UI 요소**
- 우측 하단 합계 박스:
  ```
  선택 특약 합계: 79,000원/월
  예상 절감액 (유전자 할인 적용 시): -23,700원/월
  [결제하기] 버튼 (Primary Blue, 대형)
  ```

**전환**: [결제하기] 클릭 → Scene 5

---

### [Scene 5] 기밀 결제 — 1:20 ~ 1:35

**화면 구성**
- 배경 딤(Dim) 처리 + `Dialog` 모달 팝업 (center, scale-in)
- 모달 최상단 `Alert` 컴포넌트:
  ```
  [안내] 보험사 네트워크로는 결제 승인 데이터만 익명화되어 전송됩니다.
         유전자 수치 및 질병 파라미터는 전달되지 않습니다.
         Powered by NEAR Confidential Intents
  ```
- 모달 본문:
  ```
  결제 금액: 79,000 USDC/월
  결제 방식: NEAR Confidential Intents (Private Shard)
  보험사 전달 정보: Attestation Only (수치 없음)
  ```
- `[서명하여 결제]` 버튼 클릭 → NEAR 지갑 서명 팝업
- 서명 완료 → 전체 화면 0.3초 green flash + 완료 모달

**완료 화면**
```
계약이 체결되었습니다.

보험사 수신 내용: "AI 검증 완료 — 정상 승인"
유전자 정보 전달 여부: 없음
트랜잭션 ID: [NEAR Explorer 링크] (JetBrains Mono)
```

**내레이션 자막**
```
[KO] Confidential Intents를 통해 결제가 완료됩니다.
     블록체인에 기록되는 것은 "AI가 검증한 정상 승인"뿐입니다.
     췌장암 변이 수치는 보험사에도, 블록체인에도 영구히 가려집니다.

[EN] Payment finalizes via Confidential Intents.
     Only "AI-verified approval" is recorded on-chain.
     Your genetic risk scores are hidden from the insurer — and the blockchain — forever.
```

**전환**: 페이드 아웃 → Outro

---

### [Outro] — 1:35 ~ 1:40

**화면 구성**
- 검은 배경, 중앙 정렬 3줄 텍스트 순차 fade-in

```
IronClaw TEE  ·  Confidential Intents  ·  Chain Signatures

NEAR Protocol이 2026년에 처음으로 가능하게 만든 서비스.

MyDNA Insurance Agent
```

---

## Remotion 제작 가이드라인

영상은 Remotion을 활용하여 제작한다.

**기술 설정**
- `fps`: 30
- `durationInFrames`: 총 120초 × 30fps = 3,600 프레임 (실제 씬 구성에 따라 조정)
- `width`: 1920, `height`: 1080
- 컴포지션명: `MyDNADemo`

**씬별 프레임 배분**

| 씬 | 시작 프레임 | 종료 프레임 | 프레임 수 |
|---|---|---|---|
| Intro | 0 | 150 | 150 |
| Scene 1 | 150 | 600 | 450 |
| Scene 2 | 600 | 1050 | 450 |
| Scene 3 | 1050 | 1800 | 750 |
| Scene 4 | 1800 | 2400 | 600 |
| Scene 5 | 2400 | 2850 | 450 |
| Outro | 2850 | 3000 | 150 |

**애니메이션 구현 우선순위**
1. Scene 3 Memory Purge 파티클 효과 (가장 중요한 장면)
2. 씬 간 페이드/슬라이드 전환
3. Progress 바 애니메이션 (Scene 3)
4. 카드 stagger-in (Scene 4)
5. 자막 타이밍 동기화

**Mock 데이터 처리**
- 유전자 파일명: `my_genome_result_gentok_20260315.vcf`
- 지갑 주소: `alice.near`
- 트랜잭션 해시: `7xKp...mN3q` (임의 생성)
- TEE 분석 소요시간: `18.3s` (고정값, 실제 API 미연결)
- 보험료 수치는 실제 상품 기반 참고값 사용 (실제 계약 아님 고지 필요)

---

## 관련 문서

- [사용자 플로우](./USER_FLOW.md)
- [디자인 시스템](./DESIGN_SYSTEM_SHADCN.md)
- [피치덱](../01_Concept_Design/PITCH_DECK.md)
- [NEAR 기술 스택](../03_Technical_Specs/LATEST_NEAR_TECH_STACK.md)
