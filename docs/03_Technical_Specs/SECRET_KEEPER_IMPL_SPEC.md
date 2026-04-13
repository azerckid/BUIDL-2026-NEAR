# [기술 명세] The Secret Keeper — AI 상담 레이어 구현 명세

- **작성일**: 2026-04-14
- **최종 수정일**: 2026-04-14
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0 (Phase 2 착수 전 사전 설계)

---

## 1. 개요

TEE 분석 완료 후 대시보드에 노출되는 **부가 편의 기능**. 사용자가 자신의 위험 레이블(riskProfile)을 기반으로 질병·보험 관련 질문을 입력하면 AI가 공감하는 말투로 답변한다.

- 질병 의학 지식은 **LLM 내장 지식에 의존** (RAG 없음, Phase 2 초기 기준)
- 원본 DNA 시퀀스는 컨텍스트에 포함하지 않음
- 세션 종료 시 대화 맥락 소각 (Stateless)

---

## 2. 설계 원칙

| 원칙 | 내용 |
|---|---|
| **LLM 의존** | 질병·의학 지식은 별도 지식 베이스 없이 Qwen 모델 내장 지식으로 답변 |
| **컨텍스트 최소화** | riskProfile의 카테고리·레벨(high/moderate/normal) 레이블만 주입. 수치·시퀀스 미포함 |
| **Stateless** | 대화 이력을 DB에 영구 저장하지 않음. 세션 내 메모리에만 유지 |
| **공감 말투** | 딱딱한 의학 정보 나열이 아닌, 사용자의 걱정에 먼저 공감하고 정보를 제공 |
| **가드레일** | 원본 데이터 노출 거부, 확정 진단 금지, 의사 상담 권고 |

---

## 3. 시스템 프롬프트 (TypeScript 템플릿 리터럴로 관리)

시스템 프롬프트는 **TypeScript 파일 안의 템플릿 리터럴**로 관리한다.
`fs.readFileSync`는 Vercel 배포 시 파일 접근이 불안정하므로 사용하지 않는다.
(기존 코드베이스에서 동일 문제를 `mock-data.ts` TS 상수화로 해결한 사례 있음 — Stage 4 참조)

내용 수정 시 이 `.ts` 파일만 편집하면 된다. 빌드 시 번들에 포함되므로 런타임 파일 접근 불필요.

**파일 경로**: `src/lib/tee/concierge-system-prompt.ts`

```typescript
export function buildSystemPrompt(riskProfileContext: string): string {
  return `
당신은 OHmyDNA의 건강·보험 상담 도우미입니다.
사용자의 유전자 분석 결과를 바탕으로 보험과 건강에 대한 질문에 답변합니다.

## 말투 원칙
- 먼저 사용자의 걱정이나 감정에 공감하는 문장으로 시작하세요.
- 딱딱한 나열보다 자연스러운 대화체로 답변하세요.
- 불안을 가중시키지 않도록 균형 잡힌 시각을 유지하세요.
- 사용자가 작성한 언어로 답변하세요.

## 컨텍스트
사용자의 유전자 분석 결과 위험 레이블:
${riskProfileContext}

## 가드레일 (반드시 준수)
1. 원본 유전자 시퀀스(ATGC...)나 구체적 수치는 절대 언급하지 마세요. 해당 데이터는 분석 즉시 소각되었습니다.
2. "~입니다"가 아닌 "~일 수 있습니다", "~가능성이 있습니다" 형태로 답변하세요. 확정적 의학 진단을 내리지 마세요.
3. 중요한 건강 결정은 반드시 전문의 상담을 권고하세요.
4. 보험 관련 질문에는 현재 추천된 보험 상품 카테고리로 자연스럽게 연결하세요.
5. 이전 세션의 대화 내용을 기억하지 못하는 것이 정상임을 사용자가 묻는다면 솔직하게 설명하세요.
  `.trim();
}
```

---

## 4. 구현 파일 목록

### 4-1. 시스템 프롬프트 파일

| 파일 | 역할 |
|---|---|
| `src/lib/tee/concierge-system-prompt.ts` | 시스템 프롬프트 템플릿 리터럴. 내용 수정 시 이 파일만 편집 |

### 4-2. 신규 생성 파일

| 파일 | 역할 |
|---|---|
| `src/actions/chatWithConcierge.ts` | Server Action — NEAR AI Cloud 호출, riskProfile 컨텍스트 주입 |
| `src/components/modules/ConciergeChat.tsx` | 채팅 UI 컴포넌트 (대시보드 하단 삽입) |

### 4-3. 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/[locale]/dashboard/page.tsx` | `<ConciergeChat sessionId={sid} />` 추가 |

---

## 5. Server Action 구현 (`chatWithConcierge.ts`)

```typescript
'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/tee/concierge-system-prompt';

// 기존 NEAR AI Cloud 설정 재사용 (ironclaw-tee.ts와 동일한 엔드포인트)
const client = new OpenAI({
  baseURL: process.env.IRONCLAW_BASE_URL ?? 'https://cloud-api.near.ai/v1',
  apiKey: process.env.IRONCLAW_API_KEY ?? '',
});

const MODEL = process.env.CONCIERGE_MODEL ?? 'Qwen/Qwen3-30B-A3B-Instruct-2507';

// riskProfile → 자연어 레이블 변환
function formatRiskContext(riskProfile: Record<string, { level: string; flags: string[] }>): string {
  return Object.entries(riskProfile)
    .map(([category, { level, flags }]) => {
      const flagText = flags.length > 0 ? ` (주요 항목: ${flags.join(', ')})` : '';
      return `- ${category}: ${level}${flagText}`;
    })
    .join('\n');
}

const inputSchema = z.object({
  message: z.string().min(1).max(500),
  // 세션 내 대화 이력 (클라이언트 메모리 유지, DB 미저장)
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20), // 최대 20턴 유지
  riskProfile: z.record(z.object({
    level: z.string(),
    flags: z.array(z.string()),
  })),
});

export async function chatWithConcierge(input: z.infer<typeof inputSchema>) {
  const parsed = inputSchema.parse(input);
  const riskContext = formatRiskContext(parsed.riskProfile);
  const systemPrompt = buildSystemPrompt(riskContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...parsed.history,
    { role: 'user', content: parsed.message },
  ];

  const response = await client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  return {
    reply: response.choices[0].message.content ?? '',
  };
}
```

---

## 6. 가드레일 상세

| 가드레일 | 프롬프트 적용 | 코드 적용 |
|---|---|---|
| 원본 DNA 시퀀스 노출 금지 | 시스템 프롬프트 규칙 1 | riskProfile에서 flags(레이블)만 추출, 수치 미포함 |
| 확정 진단 금지 | 시스템 프롬프트 규칙 2 | — |
| 전문의 상담 권고 | 시스템 프롬프트 규칙 3 | — |
| 입력 길이 제한 | — | `message.max(500)` Zod 검증 |
| 과도한 이력 누적 방지 | — | `history.max(20)` Zod 검증 |

---

## 7. 환경 변수

| 변수 | 기본값 | 비고 |
|---|---|---|
| `IRONCLAW_BASE_URL` | `https://cloud-api.near.ai/v1` | 기존 TEE 설정 재사용 |
| `IRONCLAW_API_KEY` | — | 기존 TEE 설정 재사용 |
| `CONCIERGE_MODEL` | `Qwen/Qwen3-30B-A3B-Instruct-2507` | 선택적. 모델 교체 시 이 변수만 수정 |

신규 환경 변수 없음. 기존 IronClaw 설정을 그대로 재사용한다.

---

## 8. Phase 2 이후 확장 포인트

| 항목 | 현재 (Phase 2 초기) | 이후 확장 |
|---|---|---|
| 의학 지식 소스 | LLM 내장 지식 | RAG — 보험 약관 Vector DB 연동 |
| 대화 이력 | 클라이언트 메모리 (세션 내) | 선택적 암호화 DB 저장 |
| 스트리밍 | 없음 (단발 응답) | `stream: true` 전환 |

---

## 9. 관련 문서

- **Technical_Specs**: [AI 상담 레이어 아키텍처](./AI_CONCIERGE_ARCH.md)
- **Technical_Specs**: [IronClaw TEE 연동](./LATEST_NEAR_TECH_STACK.md)
- **QA_Validation**: [The Secret Keeper 검증 시나리오](../05_QA_Validation/SECRET_KEEPER_VALIDATION.md)
- **Logic_Progress**: [마일스톤 로드맵](../04_Logic_Progress/ROADMAP.md)
