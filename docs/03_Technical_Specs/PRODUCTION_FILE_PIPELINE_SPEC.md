# 정식 서비스 유전자 파일 처리 파이프라인 명세

- **작성일**: 2026-04-06
- **레이어**: 03_Technical_Specs
- **상태**: 정식 서비스 목표 아키텍처 (Phase 0 이후 구현 대상)
- **관련 문서**: `FILE_UPLOAD_FLOW.md` (현재 Phase 0 구현 현황)

---

## 개요

이 문서는 해커톤 데모(Phase 0)가 아닌 **정식 서비스로서** 유전자 파일 처리가 어떻게 이루어져야 하는지를 정의한다.

핵심 원칙: **유전자 원본 데이터는 어떤 경우에도 TEE 외부에 노출되어서는 안 된다.**

이 원칙은 아키텍처의 모든 결정에 우선한다. 서버, DB, 개발자 그 누구도 원본 유전자 데이터와 risk_score 수치를 볼 수 없어야 한다.

---

## 3-Layer Privacy Model

```
Layer 1 — Privacy Compute (TEE)
  유전자 데이터의 암호화, 분석, ZKP 생성, 소각이 모두 이루어지는 유일한 공간.
  IronClaw Runtime (NEAR TEE Secure Enclave).

Layer 2 — Edge Database (메타데이터만)
  Turso DB에는 카테고리별 위험 수준(high/moderate/normal)과 플래그 목록만 저장.
  원본 수치, 원본 파일, risk_score는 절대 저장되지 않음.

Layer 3 — Web3 Trust (온체인 검증)
  ZKP proof 온체인 등록, Confidential Intents 결제, Chain Signatures.
  보험사는 "자격 충족 여부"만 온체인으로 확인 가능.
```

---

## 정식 서비스 전체 흐름

### 1단계 — 파일 선택 및 검증
**실행 위치: 브라우저**

- 허용 포맷: `.vcf` / `.txt` (젠톡) / `.csv` / `.pdf`
- 파일 크기 상한: 5MB
- Zod 스키마 검증 (확장자, 크기)
- 검증 통과 시 브라우저 메모리에 보관

Phase 0과 동일. 변경 없음.

---

### 2단계 — SHA-256 해시 계산 + TEE Attestation 검증
**실행 위치: 브라우저**

```
1. computeSHA256(file)
     → fileHash: 무결성 증거 (나중에 TEE가 동일 파일을 받았는지 검증용)

2. IronClaw TEE Attestation 조회
     → TEE 인스턴스 공개키 수신
     → Attestation Report 검증 (신뢰할 수 있는 TEE인지 확인)
     → 검증 실패 시 업로드 중단
```

**Phase 0 대비 추가되는 것: TEE Attestation 검증 단계**

Attestation이 없으면 사용자는 자신이 데이터를 보내는 곳이 진짜 TEE인지 알 수 없다. 이 검증은 프라이버시 보장의 전제 조건이다.

---

### 3단계 — 파일 암호화 후 전송
**실행 위치: 브라우저 → TEE**

```
1. 파일 원본 바이트를 TEE 공개키로 암호화
     알고리즘: ECIES (Elliptic Curve Integrated Encryption Scheme)
               + AES-256-GCM (대칭키 암호화)
     암호화 키: TEE Attestation에서 수신한 TEE 공개키

2. 암호화된 바이트스트림 전송
     경로: 브라우저 → Next.js 서버(릴레이) → IronClaw TEE
     서버는 내용을 볼 수 없음 — 릴레이 역할만 수행

3. SHA-256 해시는 별도로 서버에 전달 (DB 저장용)
```

**이 시점에서 평문 파일 내용은 네트워크를 절대 통과하지 않는다.**

---

### 4단계 — TEE 내부 처리
**실행 위치: IronClaw TEE Secure Enclave (NEAR AI Cloud)**

TEE 내부에서 아래 모든 처리가 순서대로 이루어진다.

```
1. 복호화
     TEE 개인키로 암호화된 파일 복호화
     → 파일 원본 바이트 (TEE 메모리에만 존재)

2. 파일 포맷 감지 및 파싱
     .txt / .vcf → parseGentokTxt() 실행
     .pdf        → PDF 텍스트 추출 후 파싱
     .csv        → CSV 파서 실행
     → NormalizedGeneticProfile 생성

3. 위험 수준 분석
     AI 모델 (Qwen3-30B 또는 교체 가능 모델) 실행
     → risk_score 계산 (수치)
     → riskProfile 생성 (카테고리별 high/moderate/normal + flags)
     risk_score 수치는 이 단계에서 TEE 메모리에만 존재

4. ZKP proof 생성
     Noir 회로 실행 (circuits/insurance_eligibility/src/main.nr)
       private input: risk_score  ← TEE 내부 값, 외부 미노출
       public input:  threshold   ← 보험사 공개 기준값
       assert(risk_score >= threshold)
     → proof_bytes 생성

5. 메모리 소각 (Secure Erase)
     파일 원본, risk_score, 중간 계산값 전체 소각
     → purgeConfirmed: true

6. TEE 외부로 반환하는 것
     - riskProfile (카테고리 레벨 + flags — 수치 없음)
     - zkp_proof_bytes
     - purgeConfirmed: true
     - teeSessionId
     - Attestation Report (소각 증명 포함)
```

**TEE 외부로 나오지 않는 것: 파일 원본, risk_score 수치, 중간 계산값 일체**

---

### 5단계 — 서버: 결과 수신 및 DB 저장
**실행 위치: Next.js 서버**

```
TEE로부터 수신:
  - riskProfile (카테고리 레벨 + flags)
  - zkp_proof_bytes
  - purgeConfirmed: true

DB 저장 (Turso — analysis_results):
  - riskProfile: JSON (카테고리 레벨 + flags만)
  - zkpProofHash: SHA-256(zkp_proof_bytes)
  - recommendedProductIds: 상품 매칭 결과

DB에 저장되지 않는 것:
  - 파일 원본
  - risk_score 수치
  - zkp_proof_bytes 원본 (해시만 저장)
```

---

### 6단계 — ZKP proof 온체인 등록
**실행 위치: 서버 → NEAR 온체인**

```
zkp.rogulus.testnet (또는 mainnet 컨트랙트) 호출
  → submit_proof(proof_bytes, session_id) 트랜잭션
  → NEAR 블록체인에 proof 영구 기록
  → txHash 반환

보험사가 이후 검증하는 방법:
  → verify_proof(proof_hash) 온체인 조회
  → "이 사용자는 기준을 충족한다" 사실만 확인
  → 실제 수치는 알 수 없음
```

---

### 7단계 — 데이터 소각 온체인 증명
**실행 위치: TEE → NEAR 온체인**

```
IronClaw TEE Attestation Report를 NEAR 스마트 컨트랙트에 제출
  → "세션 {sessionId}의 데이터가 {timestamp}에 소각되었다"는 사실 온체인 기록
  → 사용자가 NEAR Explorer에서 직접 확인 가능
  → 보험사, 규제기관이 제3자 검증 가능
```

---

## 정식 서비스 전체 흐름 다이어그램

```
[브라우저]               [서버 (릴레이)]      [IronClaw TEE]         [NEAR 온체인]

파일 선택
SHA-256 해시 계산
TEE Attestation 조회 ──────────────────→ Attestation Report 반환
← TEE 공개키 수신
파일 ECIES+AES-256 암호화
  ↓ 암호화된 바이트
createSession() ────→ DB: file_hash 저장
암호화 파일 전송 ────→ TEE로 릴레이 ─────→ 복호화 (TEE 개인키)
                                          포맷 감지 + 파싱
                                          AI 분석
                                          risk_score [PRIVATE]
                                          Noir ZKP 실행
                                          proof_bytes 생성
                                          메모리 전체 소각
                       ←──────────────── riskProfile (레벨/플래그)
                       ←──────────────── zkp_proof_bytes
                       ←──────────────── purgeConfirmed: true
DB: analysisResults ──
  (레벨/플래그만)
ZKP 온체인 등록 ───────────────────────────────────────────→ proof 기록
소각 증명 등록 ────────────────────────────────────────────→ Attestation 기록
  ↓
대시보드 이동
```

---

## Phase 0과의 차이 요약

| 항목 | Phase 0 (현재) | 정식 서비스 (목표) |
|------|---------------|-------------------|
| 파일 전송 | 전송 안 함 (mock 상수) | ECIES+AES-256-GCM 암호화 후 전송 |
| TEE Attestation | 없음 | 업로드 전 필수 검증 |
| 파싱 위치 | 서버 (mock 상수) | TEE 내부 |
| risk_score | 서버에서 계산 (mock) | TEE 내부 전용 |
| ZKP 생성 | 서버 (더미) | TEE 내부 (Noir 회로) |
| ZKP 온체인 등록 | 더미 hash 등록 | 실제 proof_bytes 등록 |
| 데이터 소각 | DB 상태값 변경만 | TEE 실소각 + 온체인 Attestation |
| 서버의 원본 접근 가능 여부 | 이론상 가능 | 불가 (암호화된 바이트만 통과) |

---

## 구현 우선순위

정식 서비스 전환을 위한 작업을 중요도 순으로 나열한다.

| 순서 | 작업 | 이유 |
|------|------|------|
| 1 | 실제 파일 내용 → TEE 전달 경로 구현 | 핵심 기능 — 이것 없이는 실제 서비스 불가 |
| 2 | TEE Attestation 검증 | 프라이버시 보장의 전제 조건 |
| 3 | ECIES+AES-256-GCM 클라이언트 암호화 | 전송 구간 보안 |
| 4 | Noir ZKP 실컴파일 + TEE 내부 실행 | 온체인 검증 가능성 확보 |
| 5 | 소각 Attestation 온체인 등록 | 사용자/규제기관 신뢰 확보 |
| 6 | PDF 파서 구현 | 실제 검사 결과지 지원 |
