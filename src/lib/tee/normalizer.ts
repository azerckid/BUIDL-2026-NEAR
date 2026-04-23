import { NormalizedGeneticProfile, GeneticRiskFlag, RiskLevel } from "@/types/genetic";
import { MOCK_GENTOK_CONTENT } from "./mock-data";

// ─── 레이블 매핑 (AI_MATCHING_PIPELINE.md 2-2절 기준) ────────────────────────

const GENTOK_LABEL_MAP: Record<string, RiskLevel> = {
  "주의 필요": "high",
  "높음": "high",
  "관심 필요": "moderate",
  "보통": "moderate",
  "정상": "normal",
  "낮음": "normal",
};

const SECTION_TO_CATEGORY: Record<string, keyof Pick<NormalizedGeneticProfile, "oncology" | "cardiovascular" | "metabolic" | "neurological">> = {
  ONCOLOGY: "oncology",
  CARDIOVASCULAR: "cardiovascular",
  METABOLIC: "metabolic",
  NEUROLOGICAL: "neurological",
};

const VALID_FLAGS = new Set<GeneticRiskFlag>([
  "pancreatic_cancer",
  "liver_cancer",
  "lung_cancer",
  "breast_cancer",
  "colon_cancer",
  "myocardial_infarction",
  "stroke",
  "arrhythmia",
  "type2_diabetes",
  "hyperlipidemia",
  "thyroid_disorder",
  "alzheimers",
  "parkinsons",
]);

// ─── 카테고리 레벨 결정 ───────────────────────────────────────────────────────

function determineCategoryLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.includes("high")) return "high";
  if (levels.includes("moderate")) return "moderate";
  return "normal";
}

// ─── VCF 수치 변환 (AI_MATCHING_PIPELINE.md 2-3절) ───────────────────────────

export function scoreToLevel(rawScore: number): RiskLevel {
  if (rawScore >= 0.7) return "high";
  if (rawScore >= 0.4) return "moderate";
  return "normal";
}

// ─── 젠톡 TXT 포맷 파서 ──────────────────────────────────────────────────────
// 실제 파일 형식: [SECTION: ONCOLOGY] 헤더 + "key: 레이블" 라인

export function parseGentokTxt(content: string): NormalizedGeneticProfile {
  type CategoryKey = "oncology" | "cardiovascular" | "metabolic" | "neurological";

  const sectionFlags: Record<CategoryKey, { flag: GeneticRiskFlag; level: RiskLevel }[]> = {
    oncology: [],
    cardiovascular: [],
    metabolic: [],
    neurological: [],
  };

  const detectedFlags: Record<CategoryKey, GeneticRiskFlag[]> = {
    oncology: [],
    cardiovascular: [],
    metabolic: [],
    neurological: [],
  };

  let currentCategory: CategoryKey | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // 섹션 헤더: [SECTION: ONCOLOGY]
    const sectionMatch = line.match(/^\[SECTION:\s*([A-Z]+)\]$/);
    if (sectionMatch) {
      currentCategory = SECTION_TO_CATEGORY[sectionMatch[1]] ?? null;
      continue;
    }

    if (!currentCategory) continue;

    // 키-값: pancreatic_cancer: 주의 필요
    const kvMatch = line.match(/^([a-z_]+):\s*(.+)$/);
    if (!kvMatch) continue;

    const key = kvMatch[1] as GeneticRiskFlag;
    const label = kvMatch[2].trim();

    if (!VALID_FLAGS.has(key)) continue;

    const level: RiskLevel = GENTOK_LABEL_MAP[label] ?? "normal";
    sectionFlags[currentCategory].push({ flag: key, level });

    if (level !== "normal") {
      detectedFlags[currentCategory].push(key);
    }
  }

  return {
    oncology: {
      overallLevel: determineCategoryLevel(sectionFlags.oncology.map((f) => f.level)),
      detectedFlags: detectedFlags.oncology,
    },
    cardiovascular: {
      overallLevel: determineCategoryLevel(sectionFlags.cardiovascular.map((f) => f.level)),
      detectedFlags: detectedFlags.cardiovascular,
    },
    metabolic: {
      overallLevel: determineCategoryLevel(sectionFlags.metabolic.map((f) => f.level)),
      detectedFlags: detectedFlags.metabolic,
    },
    neurological: {
      overallLevel: determineCategoryLevel(sectionFlags.neurological.map((f) => f.level)),
      detectedFlags: detectedFlags.neurological,
    },
    parsedFrom: "gentok",
    fileType: "txt",
  };
}

// Phase 0 fallback: mock 상수 파싱
export function parseMockFile(): NormalizedGeneticProfile {
  return parseGentokTxt(MOCK_GENTOK_CONTENT);
}

// Stage 17: ECIES 암호화된 base64 파일 데이터를 받아 파싱.
// 현재는 복호화 없이 base64 → UTF-8 텍스트로 디코딩 후 파싱.
// Phase 3에서 TEE 내부 복호화로 교체 예정.
export function parseGeneticFile(encryptedBase64: string): NormalizedGeneticProfile {
  try {
    const text = Buffer.from(encryptedBase64, "base64").toString("utf-8");
    return parseGentokTxt(text);
  } catch {
    // 복호화/파싱 실패 시 mock fallback (Phase 3 이전 안전망)
    return parseMockFile();
  }
}
