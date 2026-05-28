#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_OUT = "data/insurance/latest_premium_quote_probe.json";
const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; premium-quote-probe)";
const E_INSMARKET_BASE_URL = "https://e-insmarket.or.kr";

const CONDITIONS = [
  {
    conditionId: "age34_male",
    age: 34,
    sex: "male",
    cancerSexCode: "1",
    medicalSexCode: "M",
  },
  {
    conditionId: "age34_female",
    age: 34,
    sex: "female",
    cancerSexCode: "2",
    // 보험다모아 모바일 실손의료보험 성별 버튼은 여자 값을 "L"로 submit한다.
    medicalSexCode: "L",
  },
  {
    conditionId: "age44_male",
    age: 44,
    sex: "male",
    cancerSexCode: "1",
    medicalSexCode: "M",
  },
  {
    conditionId: "age44_female",
    age: 44,
    sex: "female",
    cancerSexCode: "2",
    // 보험다모아 모바일 실손의료보험 성별 버튼은 여자 값을 "L"로 submit한다.
    medicalSexCode: "L",
  },
];

const TARGETS = [
  {
    productCode: "L01C009000009",
    provider: "한화생명",
    productGroup: "암보험",
  },
  {
    productCode: "L11C009000006",
    provider: "신한라이프생명",
    productGroup: "암보험",
  },
  {
    productCode: "N11G004000001G",
    provider: "DB손보",
    productGroup: "실손의료보험",
  },
  {
    productCode: "N10G004000002G",
    provider: "KB손보",
    productGroup: "실손의료보험",
  },
  {
    productCode: "N08G004000002G",
    provider: "삼성화재",
    productGroup: "실손의료보험",
  },
  {
    productCode: "N09G004000001G",
    provider: "현대해상",
    productGroup: "실손의료보험",
  },
];

const ProbeProductSchema = z.object({
  condition_id: z.string(),
  source_id: z.string(),
  product_group: z.string(),
  quote_source_url: z.string().url(),
  quote_method: z.string(),
  quote_params_json: z.string(),
  response_hash_sha256: z.string().length(64),
  provider: z.string(),
  raw_product_name: z.string(),
  e_insmarket_product_code: z.string().nullable(),
  premium_text: z.string(),
  monthly_premium_krw: z.number().int().positive().nullable(),
});

const OutputSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    output_version: z.string(),
  }),
  conditions: z.array(
    z.object({
      condition_id: z.string(),
      age: z.number().int(),
      sex: z.string(),
      source_sex_codes: z.object({
        cancer: z.string(),
        medical: z.string(),
      }),
    }),
  ),
  source_status: z.array(
    z.object({
      condition_id: z.string(),
      source_id: z.string(),
      product_group: z.string(),
      method: z.string(),
      url: z.string().url(),
      http_status: z.number().int().nullable(),
      status: z.string(),
      evidence: z.string(),
      response_hash_sha256: z.string().length(64).nullable(),
    }),
  ),
  quote_rows: z.array(ProbeProductSchema),
  target_matrix: z.array(
    z.object({
      product_code: z.string(),
      provider: z.string(),
      product_group: z.string(),
      quotes: z.array(
        z.object({
          condition_id: z.string(),
          premium_text: z.string().nullable(),
          monthly_premium_krw: z.number().int().positive().nullable(),
          found: z.boolean(),
        }),
      ),
    }),
  ),
  qa: z.object({
    quote_requery_possible: z.boolean(),
    targets_with_premium_variation: z.array(
      z.object({
        product_code: z.string(),
        provider: z.string(),
        product_group: z.string(),
        condition_count: z.number().int(),
        premiums_krw: z.array(z.number().int().positive()),
      }),
    ),
    blockers: z.array(z.string()),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out") {
      args.out = argv[index + 1];
      index += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/probe-premium-quotes.mjs [--out path] [--timeout-ms 30000]

Default output:
  ${DEFAULT_OUT}
`);
}

function cleanText(value) {
  return htmlDecode(String(value))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlDecode(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function normalizeHttpUrl(rawUrl) {
  const value = cleanText(rawUrl);
  if (!value || value === "#") {
    return null;
  }
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  try {
    return new URL(value, E_INSMARKET_BASE_URL).toString();
  } catch {
    return null;
  }
}

function normalizePremiumKrw(premiumText) {
  const digits = cleanText(premiumText).replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number(digits);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function parseProductLinkFields(productBody, fallbackCode) {
  const linkMatch = productBody.match(/linkInsu\('([^']*)',\s*'([^']*)'\)/i);
  return {
    official_product_url: normalizeHttpUrl(linkMatch?.[1]),
    e_insmarket_product_code: cleanText(linkMatch?.[2] ?? fallbackCode) || null,
  };
}

function parseCardProducts(html, source, conditionId) {
  const products = [];
  const pattern =
    /<div class="logo">[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?<span class="name"><em>([\s\S]*?)<\/em>([\s\S]*?)<div class="hidden">[\s\S]*?<span id="prdtCd">([^<]*)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    const productBody = match[3];
    const premiumMatch = productBody.match(
      /<span class="cost">보험료<strong>([\s\S]*?)<\/strong>/i,
    );
    const linkFields = parseProductLinkFields(productBody, match[4]);
    const premiumText = premiumMatch ? cleanText(premiumMatch[1]) : "";

    products.push({
      condition_id: conditionId,
      source_id: source.sourceId,
      product_group: source.productGroup,
      quote_source_url: source.url,
      quote_method: source.method,
      quote_params_json: JSON.stringify(source.params),
      response_hash_sha256: source.responseHashSha256,
      provider: cleanText(match[1]),
      raw_product_name: cleanText(match[2]),
      e_insmarket_product_code: linkFields.e_insmarket_product_code,
      premium_text: premiumText,
      monthly_premium_krw: normalizePremiumKrw(premiumText),
    });
  }

  return products;
}

function parseMedicalProducts(html, source, conditionId) {
  const products = [];
  const pattern =
    /<div class="logo">[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?<span class="name"><em>([\s\S]*?)<\/em>([\s\S]*?)<div class="hidden">[\s\S]*?<span id="prdtCd">([^<]*)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    const productBody = match[3];
    const premiumMatch = productBody.match(/<strong id="[^"]+">([\s\S]*?)<\/strong>/i);
    const linkFields = parseProductLinkFields(productBody, match[4]);
    const premiumText = premiumMatch ? cleanText(premiumMatch[1]) : "";

    products.push({
      condition_id: conditionId,
      source_id: source.sourceId,
      product_group: source.productGroup,
      quote_source_url: source.url,
      quote_method: source.method,
      quote_params_json: JSON.stringify(source.params),
      response_hash_sha256: source.responseHashSha256,
      provider: cleanText(match[1]),
      raw_product_name: cleanText(match[2]),
      e_insmarket_product_code: linkFields.e_insmarket_product_code,
      premium_text: premiumText,
      monthly_premium_krw: normalizePremiumKrw(premiumText),
    });
  }

  return products;
}

async function fetchText(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method,
      body: options.body,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildCancerSource(condition) {
  const params = new URLSearchParams({
    action: "search",
    age: String(condition.age),
    enterType: "A",
    indemnityTypeA: "1",
    prdtSmlClsCd: "D001",
    renewTypeA: "C1",
    renewTypeB: "",
    sex: condition.cancerSexCode,
  });

  return {
    sourceId: "e_insmarket_cancer_mobile",
    productGroup: "암보험",
    method: "GET",
    parser: "card",
    url: `${E_INSMARKET_BASE_URL}/m/cancerIns/cancerInsList.knia?${params.toString()}`,
    params: Object.fromEntries(params.entries()),
  };
}

function buildMedicalSource(condition) {
  const bodyEntries = [
    ["prdtSmlClsCd", "G004"],
    ["sexDiv", condition.medicalSexCode],
    ["age", String(condition.age)],
    ["sex", condition.medicalSexCode],
    ["realLossDivCd", "3"],
    ["action", "search"],
    ["enterType", "A"],
    ["renewalCd", ""],
    ["insrCmpyCd", "N01"],
    ["insrCmpyCd", "N02"],
    ["insrCmpyCd", "N03"],
    ["insrCmpyCd", "N05"],
    ["insrCmpyCd", "N08"],
    ["insrCmpyCd", "N09"],
    ["insrCmpyCd", "N10"],
    ["insrCmpyCd", "N11"],
    ["insrCmpyCd", "N71"],
    ["joinScrtDivCd", "A"],
    ["joinScrtDivCd", "B"],
  ];

  return {
    sourceId: "e_insmarket_medical_5th_mobile",
    productGroup: "실손의료보험",
    method: "POST",
    parser: "medical",
    url: `${E_INSMARKET_BASE_URL}/m/mins/minsInsList.knia`,
    body: new URLSearchParams(bodyEntries),
    params: bodyEntries,
  };
}

async function probeSource(source, conditionId, timeoutMs) {
  const result = await fetchText(source.url, {
    method: source.method,
    body: source.body,
    timeoutMs,
  });
  const responseHash = createHash("sha256").update(result.text).digest("hex");
  const parserSource = {
    ...source,
    responseHashSha256: responseHash,
  };
  const products =
    source.parser === "medical"
      ? parseMedicalProducts(result.text, parserSource, conditionId)
      : parseCardProducts(result.text, parserSource, conditionId);

  return {
    status: {
      condition_id: conditionId,
      source_id: source.sourceId,
      product_group: source.productGroup,
      method: `${source.method} HTML`,
      url: source.url,
      http_status: result.status,
      status: result.ok ? "accessible" : "http_error",
      evidence: `Extracted ${products.length} ${source.productGroup} product rows for ${conditionId}.`,
      response_hash_sha256: responseHash,
    },
    products,
  };
}

function buildTargetMatrix(quoteRows) {
  return TARGETS.map((target) => {
    const quotes = CONDITIONS.map((condition) => {
      const match = quoteRows.find(
        (row) =>
          row.condition_id === condition.conditionId &&
          row.e_insmarket_product_code === target.productCode,
      );

      return {
        condition_id: condition.conditionId,
        premium_text: match?.premium_text ?? null,
        monthly_premium_krw: match?.monthly_premium_krw ?? null,
        found: Boolean(match),
      };
    });

    return {
      product_code: target.productCode,
      provider: target.provider,
      product_group: target.productGroup,
      quotes,
    };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = DateTime.now().setZone("Asia/Seoul");
  const sourceStatus = [];
  const quoteRows = [];

  for (const condition of CONDITIONS) {
    const sources = [buildCancerSource(condition), buildMedicalSource(condition)];

    for (const source of sources) {
      const probe = await probeSource(source, condition.conditionId, args.timeoutMs);
      sourceStatus.push(probe.status);
      quoteRows.push(...probe.products);
    }
  }

  const targetMatrix = buildTargetMatrix(quoteRows);
  const failedSources = sourceStatus.filter((status) => status.status !== "accessible");
  const targetsWithPremiumVariation = targetMatrix.flatMap((target) => {
    const premiums = new Set(
      target.quotes
        .map((quote) => quote.monthly_premium_krw)
        .filter((premium) => typeof premium === "number"),
    );
    if (premiums.size < 2) {
      return [];
    }

    return [
      {
        product_code: target.product_code,
        provider: target.provider,
        product_group: target.product_group,
        condition_count: target.quotes.filter((quote) => quote.found).length,
        premiums_krw: Array.from(premiums).sort((a, b) => a - b),
      },
    ];
  });

  const output = OutputSchema.parse({
    metadata: {
      generated_at: generatedAt.toISO(),
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/probe-premium-quotes.mjs",
      output_version: "1.0",
    },
    conditions: CONDITIONS.map((condition) => ({
      condition_id: condition.conditionId,
      age: condition.age,
      sex: condition.sex,
      source_sex_codes: {
        cancer: condition.cancerSexCode,
        medical: condition.medicalSexCode,
      },
    })),
    source_status: sourceStatus,
    quote_rows: quoteRows,
    target_matrix: targetMatrix,
    qa: {
      quote_requery_possible: targetsWithPremiumVariation.length > 0,
      targets_with_premium_variation: targetsWithPremiumVariation,
      blockers: [
        ...failedSources.map(
          (source) =>
            `${source.source_id} ${source.condition_id} returned ${source.http_status}; request parameters need follow-up before full matrix collection.`,
        ),
        "보험다모아 조회 조건은 대표 비교 조건이며 확정 견적이나 청약 심사 결과가 아니다.",
        "sex code mapping은 URL/POST parameter 기반으로 정리했으며 공식 API 문서 기반 검증은 추가 필요하다.",
        "보장금액, 납입기간, 특약 조합은 이번 PoC에서 아직 재조회하지 않았다.",
      ],
      next_actions: [
        "수집된 quote row를 백업 후 insurance_premium_quotes에 needs_review 상태로 적재한다.",
        "실손의료보험 가입담보 A/B 외 E~J 특약 조합은 별도 quote dimension으로 확장한다.",
        "사용자 UI에서는 대표 보험료와 조건별 예상 보험료를 분리해서 표시한다.",
      ],
    },
  });

  const outPath = resolve(args.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(
    `Wrote ${outPath} with ${sourceStatus.length} source probes and ${quoteRows.length} quote rows.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
