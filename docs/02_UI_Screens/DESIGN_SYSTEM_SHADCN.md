# [UI 설계] 디자인 시스템 및 프론트엔드 아키텍처 (Shadcn/ui)

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-01
- **레이어**: 02_UI_Screens
- **상태**: Draft v1.0

---

## 1. 프론트엔드 기술 스택
- **프레임워크**: Next.js (App Router 기반)
- **스타일링**: Tailwind CSS v4
- **UI 라이브러리**: Shadcn/ui (Radix UI 기반 접근성 완비)
- **아이콘**: Lucide-react (Shadcn 기본 연동)
- **애니메이션/상태**: Framer Motion (프라이버시 요소 전환 시점 시각화)

---

## 2. 디자인 테마 (Theme & Aesthetics)
"유전자 데이터의 미래지향적 취급"과 "금융의 신뢰"를 동시에 잡는 **사이버네틱 메디컬(Cybernetic Medical)** 톤 앤 매너 적용.

*   **배경 (Background)**: 심리스한 프리미엄 블랙 (`bg-zinc-950` / `bg-black`)
*   **주조색 (Primary)**: NEAR 생태계를 상징하면서도 신뢰감을 주는 일렉트릭 블루 계열 (`bg-blue-600`, 텍스트 강조 시 퓨어 네온)
*   **경고 및 프라이버시 강조 (Destructive & Privacy)**: 
    *   질병 위험도 붉은색 (`bg-destructive`)
    *   데이터 파기 알림은 라임/그린 계열 등 긍정적 시각화로 "소각 완료" 성공을 표현 (`bg-emerald-500`)
*   **컴포넌트 반경 (Radius)**: 0.5rem (약간 둥글어 딱딱하지 않은 최신 웹 트렌드 적용)

---

## 3. 타이포그래피 시스템 (Typography)

**폰트 패밀리**:
- **영문/숫자**: `Inter` (가독성 및 숫자 구분 최적화, Google Fonts CDN 또는 `next/font/google` 로드)
- **한국어**: `Pretendard` (`@fontsource/pretendard` 패키지, 가변 폰트 사용으로 번들 최적화)
- **코드/주소**: `JetBrains Mono` (지갑 주소, 트랜잭션 해시 등 모노스페이스 표시)

**크기 스케일 (Tailwind 기반)**:

| 용도 | Tailwind 클래스 | 크기 | 줄간격 |
| :--- | :--- | :--- | :--- |
| 히어로 타이틀 | `text-5xl font-bold` | 48px | 1.1 |
| 섹션 헤딩 | `text-2xl font-semibold` | 24px | 1.3 |
| 카드 타이틀 | `text-lg font-medium` | 18px | 1.4 |
| 본문 | `text-sm` | 14px | 1.6 |
| 캡션/레이블 | `text-xs` | 12px | 1.5 |
| 지갑 주소 | `font-mono text-xs` | 12px | 1.4 |

---

## 4. 다국어 지원 전략 (i18n)

글로벌 진출(싱가포르, EU) 목표에 따라 다국어 지원을 초기부터 설계합니다.

- **라이브러리**: `next-intl` (Next.js App Router 네이티브 지원, Server Component 호환)
- **지원 언어 우선순위**: 한국어(ko) → 영어(en) → 일본어(ja, Phase 3)
- **디렉토리 구조**:
  ```
  src/
   └── messages/
        ├── ko.json   # 한국어 (기본)
        └── en.json   # 영어
  ```
- **RTL 대응**: 중동 시장 진출 전까지 LTR 전용으로 운영. 추후 `dir="rtl"` 지원 시 Tailwind의 `rtl:` variant 활용.
- **날짜/통화 포맷**: `Luxon`의 `DateTime.toLocaleString()` 사용. 보험료는 `Intl.NumberFormat`으로 지역 통화 표시.

---

## 5. Framer Motion 애니메이션 스펙 (Animation Spec)

각 UI 단계별 전환 시점과 애니메이션을 명시합니다.

| 단계 | 트리거 | 애니메이션 | 설정값 |
| :--- | :--- | :--- | :--- |
| Step 1 → Step 2 | 지갑 연결 성공 | 랜딩 페이지 fade-out + 업로드 영역 slide-up | `duration: 0.4, ease: "easeOut"` |
| Step 2 파일 드롭 | 파일 드래그 진입 | 드롭존 border glow 펄스 | `repeat: Infinity, duration: 1.2` |
| Step 2 → Step 3 | 업로드 완료 | 파일 아이콘 → 자물쇠 아이콘 morph + scale-down | `duration: 0.6, type: "spring"` |
| Step 3 분석 중 | TEE 진입 | 배경 스캔라인 이펙트 (Y축 반복 이동) | `repeat: Infinity, duration: 2.0, ease: "linear"` |
| Step 3 분석 완료 | Memory Purge | 자물쇠 아이콘 먼지 파티클 해산 + 녹색 체크 팝인 | `duration: 0.8, type: "spring", bounce: 0.4` |
| Step 3 → Step 4 | 대시보드 진입 | 카드 stagger-in (순차적 fade + slide-up) | `staggerChildren: 0.08, duration: 0.3` |
| Step 5 결제 완료 | 트랜잭션 확인 | 전체 화면 brief green flash + 완료 모달 scale-in | `duration: 0.3` |

> 성능 주의: `transform`과 `opacity`만 애니메이션화하여 GPU 가속 보장. `layout` 속성 사용 시 Reflow 발생 주의.

---

## 7. 사용자 흐름별 Shadcn 컴포넌트 매핑 (User Flow ➔ Components)

### Step 1: 온보딩 및 프라이버시 서약 (Onboarding)
- **사용 기술**: `Hero Section`, `Button`
- **구현 방식**: 화면 중앙에 웅장한 타이포그래피 배치. 사용자의 클릭을 유도하는 'Connect Wallet' 버튼에 `variant="default"` (Primary Blue) 적용. 지갑 서명 전 확인받는 프라이버시 선언문은 `Accordion` 또는 `Hover Card`로 미니멀하게 접어둠.

### Step 2: 원본 데이터 개인화 업로드 (Upload the Vault)
- **사용 기술**: 커스텀 `Drag & Drop Zone`, `Card`
- **구현 방식**: 화면 중앙의 큰 `Card` 컴포넌트를 점선(Dashed) 스타일로 구성하여 유전자 검사지(VCF/PDF) 드롭 활성화. 업로드 완료 시 뷰포트 내 파일 아이콘이 잠긴 자물쇠 애니메이션과 함께 `Lucide-react` 아이콘으로 표시됨.

### Step 3: 물리적 격리 분석 프로토콜 (Analyze in TEE)
- **사용 기술**: `Progress`, `Skeleton`, `Toast` / `Sonner`
- **구현 방식**: 
  1. AI가 데이터를 처리하는 동안 `Progress` 바가 밀실 연산 진척도를 보여줌.
  2. 대시보드의 형태가 `Skeleton` UI로 깜빡거리며 윤곽을 잡음.
  3. 완료 즉시 `Sonner` 알림 메시지로 **"원본 데이터의 메모리가 TEE 영역 안에서 영구 소각되었습니다"** 팝업 발생 (강렬한 녹색 체크 마크).

### Step 4: AI 맞춤 진단 대시보드 (Dashboard & Curation)
- **사용 기술**: `Table`, `Badge`, `Card`, `Tabs`
- **구현 방식**: 
  - **진단 결과**: "당뇨병 고위험군" 등의 경고 레이블은 `Badge`(`variant="destructive"`)를 통해 직관적으로 배치.
  - **보험 추천**: 각 추천 특약(보험상품명)을 `Card` 컴포넌트로 분리. `Tabs`를 활용하여 [내장 기관], [뇌혈관/심혈관], [DNA 대사] 등 부위별 탭 구현.
  - **구성**: 화면 분할(Grid)을 통해 왼쪽엔 리포트, 오른쪽엔 장바구니 리스트업.

### Step 5: 무자각 기밀 체결 (Confidential Checkout)
- **사용 기술**: `Dialog` (모달), `Alert`
- **구현 방식**: 추천 보험을 최종 결제하려 할 때, 페이지 이동 없이 딤(Dim) 처리된 `Dialog` 오버레이가 스크린에 뜸. 
- **UX 포인트**: `Alert` 컴포넌트를 활용하여 팝업 내 최상단에 "주의: 보험사 네트워크로는 오직 결제 승인 데이터만 익명화되어 전송됩니다. 어떤 질병 파라미터도 전달되지 않습니다."라는 경고성 안심 문구 삽입.

---

## 8. UI 개발 우선순위 (Implementation Focus)
1. **`app/globals.css` 초기 세팅**: CSS Variables를 활용하여 모든 Shadcn 컴포넌트에 Dark 테마와 메디컬/웹3 무드를 일괄 반영합니다.
2. **모바일 우선(Mobile-First) 보장**: 복잡한 대시보드 구조도 `Tailwind`의 기본 반응형(Breakpoint) 규칙에 따라 모바일 지갑 앱에서도 완벽히 작동하도록 호환성을 점검합니다. 

---

## 관련 문서
- [사용자 경험 흐름 (User Flow)](./USER_FLOW.md)
