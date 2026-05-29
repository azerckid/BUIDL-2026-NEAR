# [유전자 데이터 누수 감사] 분석 파이프라인 프라이버시 점검 및 조치 리포트
> Created: 2026-05-29
> Last Updated: 2026-05-29

- **레이어**: 05_QA_Validation
- **상태**: Audit v1.0 (조치 일부 적용)
- **범위**: 유전자 데이터 분석 파이프라인의 raw 데이터 누수 지점 점검 및 조치 (F1~F5)

---

## 0. 감사 범위 및 절대 제약

본 감사는 CLAUDE.md의 절대 아키텍처 제약 — **"raw 유전자 데이터는 Turso/영속 저장소에 절대 저장되지 않으며, TEE 휘발성 메모리에서 처리 후 즉시 purge된다"** — 가 실제 코드에서 지켜지는지 검증한다.

추적한 데이터 흐름:

```
파일 선택 → SHA-256 해시 + base64 변환
  → (A) sessionStorage 임시 보관
  → createSession (DB: 해시만 저장)
  → 지갑 서명 → runAnalysis
  → IronClaw TEE chat completions (프롬프트 인라인 전달)
  → analysis_results 저장 (파생 데이터)
```

---

## 1. 발견 사항 요약

| ID | 심각도 | 항목 | 상태 |
|---|---|---|---|
| F1 | 매우 높음 | raw 유전자 파일이 near.ai 영속 Files API에 업로드(미사용·영속 사본) | 조치 완료 |
| F2 | 매우 높음 | ECIES 암호화 모듈이 데드코드 — raw 데이터 평문 전송 | 외부 의존 (블로커 1) |
| F3 | 높음 | raw 유전자 데이터 전체가 브라우저 sessionStorage에 평문 보관 | 부분 조치 (실패 경로 정리 보강) |
| F4 | 중간 | LLM 자유 텍스트 출력이 DB에 영속화 | 정책 필요 |
| F5 | 낮음 | TEE 응답 일부가 에러 메시지로 클라이언트 반환 | 조치 완료 |

긍정 확인:
- `createSession`은 `fileHash`(SHA-256)와 `fileType`만 저장 — **DB에 raw 데이터 미저장 확인**.
- 런타임 경로에 `console.log` 없음(`seed.ts` 시드 스크립트에만 존재).

---

## 2. 상세 및 조치 내역

### F1 [매우 높음] raw 유전자 파일의 영속 Files API 업로드 — 조치 완료

- **현상**: `uploadToIronClaw.ts`가 전체 원본 파일을 `client.files.create({ purpose: "assistants" })`로 `cloud-api.near.ai`에 업로드. 그러나 실제 분석(`ironclaw-tee.ts`)은 `rawContent`를 프롬프트에 인라인으로 다시 전달하며, `fileId`는 텍스트 참조로만 쓰일 뿐 모델이 파일을 retrieve하지 않음. 즉 업로드는 **분석에 불필요**하면서 OpenAI 호환 Files 객체는 명시적 삭제 전까지 **서버에 영속** → "즉시 purge" 제약 위반 + 제3자 스토리지에 원본 사본 잔존.
- **조치**:
  - `FileUploadZone.tsx`에서 `uploadToIronClaw` 병렬 호출 제거, `createSession` 단독 호출로 변경.
  - `FILE_ID` sessionStorage 저장 제거.
  - 고아가 된 `src/actions/uploadToIronClaw.ts` 파일 삭제(재도입 방지).

### F2 [매우 높음] ECIES 암호화 데드코드 — 외부 의존, 미조치

- **현상**: `src/lib/tee/encryption.ts`의 `encryptForTee`/`validateEncryptedPayload`는 정의만 존재하고 호출처 0건. CLAUDE.md는 "Genetic data is encrypted (ECIES + AES-256-GCM) before transmission"을 명시하나, 실제 분석 프롬프트(`ironclaw-tee.ts`)는 평문 텍스트를 TLS만으로 전송.
- **원인**: [[phase3_blockers]] 블로커 1 — Intel TDX hardware sealing key 접근 불가로 TEE 측 복호화 미구현. NEAR AI 팀 전용 복호화 API 의존.
- **권고(단기)**: 코드/문서/UI의 "암호화 후 전송" 주장을 실제 상태에 맞게 정정하여 과장 방지. near.ai 엔드포인트가 attested TEE임을 `verifyAttestation` 결과로 게이팅하는지 재확인.
- **근본 해결**: Phase 3, NEAR AI 팀 응답 선행.

### F3 [높음] sessionStorage 평문 보관 — 부분 조치

- **현상**: `FILE_CONTENT_${sessionId}` 키로 전체 파일 base64가 브라우저 sessionStorage에 평문 저장. XSS에 그대로 노출. 정상 흐름에선 분석 시작 시 제거되나, ① 서명 거부 catch는 NONCE만 제거하고 raw 데이터는 잔존, ② nonce 만료 early-return 시 잔존, ③ 인증 전 페이지 이탈 시 탭 세션 내내 잔존.
- **설계 제약**: my-near-wallet은 서명 시 **전체 페이지 리다이렉트**를 수행하여 메모리 상태가 소실되므로, 리다이렉트를 넘기기 위한 sessionStorage 브리징 자체는 현재 구조상 불가피.
- **조치**: `TeeAnalysisProgress.tsx`에 `clearGeneticSessionData(sessionId)` 헬퍼 추가(NONCE + FILE_ID + FILE_CONTENT 일괄 제거), 탐지 가능한 모든 종료 경로에 적용 — 서명 거부 catch, nonce 만료 early-return, injected wallet 직접 반환, 리다이렉트 복귀, 그리고 `handleAuthorize` 진입 실패(지갑 selector 부재, nonce 발급 실패).
- **잔여 위험**: ③ 인증 전 이탈 케이스는 리다이렉트 생존 요건과 충돌하여 미해결. 근본 해결은 메모리-온리 재설계 또는 클라이언트 암호화 저장(Phase 3 연계) 필요.

### F4 [중간] LLM 자유 텍스트 영속화 — 정책 필요, 미조치

- **현상**: `runAnalysis.ts`가 `reasoning`(≤500자), `coverageGapSummary`, `advisoryMessages`를 `analysis_results`에 저장. `riskProfile` 저장은 아키텍처가 명시 허용(파생 메타데이터)하나, 이 자유 서술 필드는 모델이 특정 변이/유전자명을 본문에 인용할 경우 민감 건강정보가 평문으로 영속화될 수 있음(시스템 프롬프트는 `flags`만 gene key로 제한, 본문엔 강제력 없음). 또한 `riskProfile` + `walletAddress`가 30일 보관 → 재식별 가능.
- **권고**: 보관·익명화 정책 명시, 자유 텍스트 필드에 대한 출력 후처리/검증(gene 식별자 인용 금지) 추가 검토.

### F5 [낮음] 에러 메시지의 TEE 응답 echo — 조치 완료

- **현상**: `ironclaw-tee.ts`가 JSON 파싱 실패 시 `raw.slice(0, 200)`(TEE 응답 일부)을 에러 메시지에 포함 → `runAnalysis` catch에서 클라이언트로 반환. 응답 echo 시 노출 가능.
- **조치**: 응답 본문을 메시지에서 제거, 일반 메시지로 대체.

---

## 3. 검증

- `npx tsc --noEmit`: 타입 에러 없음.
- `npx eslint`(변경 파일): 0 errors. 기존 `eslint-disable` 지시문 관련 경고 3건은 회귀 아님.

## 4. 후속 과제

- [ ] F2: "암호화 후 전송" 주장 정정 + Phase 3 ECIES 적용(NEAR AI 팀 의존)
- [ ] F3-③: 인증 전 이탈 시 잔존 데이터 — 메모리-온리/암호화 저장 재설계
- [ ] F4: 결과 데이터 보관·익명화 정책 수립 및 자유 텍스트 출력 후처리

---

## Related Documents

- **QA_Validation**: [Security Checklist](./SECURITY_CHECKLIST.md) - 보안 점검 체크리스트
- **Technical_Specs**: [Phase 3 Blockers and Inquiry](../03_Technical_Specs/PHASE3_BLOCKERS_AND_INQUIRY.md) - Phase 3 블로커 및 NEAR AI 문의
- **Technical_Specs**: [NEAR Privacy Stack Architecture](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md) - 3계층 프라이버시 모델 아키텍처
- **Technical_Specs**: [System Architecture](../03_Technical_Specs/00_SYSTEM_ARCHITECTURE.md) - 전체 시스템 구조
- **Root**: [CLAUDE.md](../../CLAUDE.md) - Key Security Rules (절대 제약)
