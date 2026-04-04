// Phase 0: B안 — fs.readFileSync 대신 TypeScript 상수로 관리
// Vercel Serverless Function 환경에서 public/ 파일시스템 접근이 불안정하므로 하드코딩
// 실제 파일: public/mock/mock_genome_gentok.txt 와 동일한 내용

export const MOCK_GENTOK_CONTENT = `# MyDNA Demo — GenTok (젠톡) Sample Report
# Version: 1.0
# Generated: 2026-04-03
# Provider: GenTok (젠톡)
# Note: This is a synthetic demo file. No real genetic data.

[SECTION: ONCOLOGY]
pancreatic_cancer: 주의 필요
liver_cancer: 주의 필요
lung_cancer: 정상
breast_cancer: 정상
colon_cancer: 관심 필요

[SECTION: CARDIOVASCULAR]
myocardial_infarction: 정상
stroke: 정상
arrhythmia: 정상

[SECTION: METABOLIC]
type2_diabetes: 관심 필요
hyperlipidemia: 정상
thyroid_disorder: 정상

[SECTION: NEUROLOGICAL]
alzheimers: 정상
parkinsons: 정상
`;
