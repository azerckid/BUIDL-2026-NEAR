#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_OUT_JSON = "data/insurance/latest_hanwha_life_quote_blocker_probe.json";
const DEFAULT_OUT_CSV = "data/insurance/latest_hanwha_life_quote_blocker_probe.csv";
const DEFAULT_TIMEOUT_MS = 30_000;
const TIMEZONE = "Asia/Seoul";
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; hanwha-life-quote-probe)";
const PRODUCT_PAGE_URL =
  "https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer";
const PRODUCT_API_BASE_URL = "https://api.hanwhalife.com/product";
const CALCULATE_URL = `${PRODUCT_API_BASE_URL}/calculate/v3/default`;
const PRODUCT_CODE = "CMS00012";

const CONDITIONS = [
  {
    conditionId: "age34_male",
    age: 34,
    sex: "male",
    sexLabel: "남자",
    genderOptionDetailId: 8333,
    genderOptionDetailCode: 3,
    genderEsbValue: "1",
  },
  {
    conditionId: "age34_female",
    age: 34,
    sex: "female",
    sexLabel: "여자",
    genderOptionDetailId: 8334,
    genderOptionDetailCode: 4,
    genderEsbValue: "2",
  },
  {
    conditionId: "age44_male",
    age: 44,
    sex: "male",
    sexLabel: "남자",
    genderOptionDetailId: 8333,
    genderOptionDetailCode: 3,
    genderEsbValue: "1",
  },
  {
    conditionId: "age44_female",
    age: 44,
    sex: "female",
    sexLabel: "여자",
    genderOptionDetailId: 8334,
    genderOptionDetailCode: 4,
    genderEsbValue: "2",
  },
];

const SOURCE_VARIANTS = [
  {
    productVariant: "standard",
    sourceId: "src_hanwha_life_e_cancer_202604",
    provider: "한화생명",
    rawProductName: "한화생명 e암보험(비갱신형)(무)(표준체형)",
    eInsmarketProductCode: "L01C009000009",
    smokingOptionDetailId: 8342,
    smokingOptionDetailCode: 1,
    bodyTypeLabel: "표준체형",
  },
  {
    productVariant: "nonsmoker",
    sourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    provider: "한화생명",
    rawProductName: "한화생명 e암보험(비갱신형)(무)(비흡연체형)",
    eInsmarketProductCode: "L01C009000010",
    smokingOptionDetailId: 8343,
    smokingOptionDetailCode: 2,
    bodyTypeLabel: "비흡연체형",
  },
];

const OutputSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.literal(TIMEZONE),
    generator: z.string(),
    output_version: z.string(),
    as_of_date: z.string(),
    product_page_url: z.string().url(),
    calculate_api_url: z.string().url(),
    product_code: z.literal(PRODUCT_CODE),
    product_name: z.string(),
    product_version: z.string(),
    product_reference_date: z.string(),
  }),
  quote_basis: z.object({
    guarantee_amount_krw: z.number().int().positive(),
    insurance_term: z.string(),
    insurance_term_label: z.string(),
    payment_term: z.string(),
    payment_term_label: z.string(),
    payment_cycle: z.string(),
    source_type: z.literal("carrier_quote"),
  }),
  official_page_examples: z.array(
    z.object({
      sex_label: z.string(),
      age: z.number().int().positive(),
      premium_text: z.string(),
      monthly_premium_krw: z.number().int().positive(),
    }),
  ),
  validation: z.object({
    official_page_http_status: z.number().int(),
    page_examples_found: z.number().int(),
    male_40_standard_matches_page: z.boolean(),
    female_40_standard_matches_page: z.boolean(),
  }),
  quote_rows: z.array(
    z.object({
      source_id: z.string(),
      provider: z.string(),
      raw_product_name: z.string(),
      product_variant: z.string(),
      e_insmarket_product_code: z.string(),
      condition_id: z.string(),
      age: z.number().int().positive(),
      sex: z.enum(["male", "female"]),
      birth_date: z.string(),
      premium_text: z.string(),
      monthly_premium_krw: z.number().int().positive(),
      quote_source_type: z.literal("carrier_quote"),
      quote_source_url: z.string().url(),
      quote_params_json: z.string(),
      quote_hash_sha256: z.string().length(64),
      api_response_hash_sha256: z.string().length(64),
      http_status: z.number().int(),
      response_return_code: z.string(),
      guide_fee_description: z.string(),
      review_status_recommendation: z.literal("needs_review"),
    }),
  ),
  qa: z.object({
    e_insmarket_zero_quote_rows: z.number().int(),
    carrier_numeric_quote_rows: z.number().int(),
    blocker_resolved: z.boolean(),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    outJson: DEFAULT_OUT_JSON,
    outCsv: DEFAULT_OUT_CSV,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    asOfDate: DateTime.now().setZone(TIMEZONE).toISODate(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-json") {
      args.outJson = argv[index + 1];
      index += 1;
    } else if (arg === "--out-csv") {
      args.outCsv = argv[index + 1];
      index += 1;
    } else if (arg === "--as-of-date") {
      args.asOfDate = argv[index + 1];
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

  const parsedDate = DateTime.fromISO(args.asOfDate, { zone: TIMEZONE });
  if (!parsedDate.isValid) {
    throw new Error("--as-of-date must be a valid ISO date");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/probe-hanwha-life-quotes.mjs [--out-json path] [--out-csv path] [--as-of-date 2026-05-31] [--timeout-ms 30000]

Default outputs:
  ${DEFAULT_OUT_JSON}
  ${DEFAULT_OUT_CSV}
`);
}

function buildHeaders(contentType) {
  const headers = {
    "user-agent": USER_AGENT,
    accept: contentType === "json" ? "application/json" : "text/html",
    origin: "https://direct.hanwhalife.com",
    referer: PRODUCT_PAGE_URL,
  };

  if (contentType === "json") {
    headers["content-type"] = "application/json";
  }

  return headers;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractNextData(html) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("Unable to find __NEXT_DATA__ in Hanwha product page");
  }
  return JSON.parse(match[1]);
}

function findProductData(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (
    Object.prototype.hasOwnProperty.call(value, "CMS_prdInfo") &&
    Object.prototype.hasOwnProperty.call(value, "CMS_premiumExList")
  ) {
    return value;
  }

  for (const child of Object.values(value)) {
    const result = findProductData(child);
    if (result) {
      return result;
    }
  }

  return null;
}

function normalizePremiumKrw(premiumText) {
  const digits = String(premiumText).replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }
  const value = Number(digits);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function formatPremiumKrw(value) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function buildBirthDate(asOfDate, age) {
  return DateTime.fromISO(asOfDate, { zone: TIMEZONE })
    .minus({ years: age })
    .toFormat("yyyyLLdd");
}

function buildCalculatePayload(condition, variant, birthDate) {
  const option = (
    optionId,
    optionCode,
    optionDetailId,
    optionDetailCode,
    inputValue,
    esbValue,
    optionDetailTypeCode = "SELECT",
    amountUnitCode = null,
  ) => ({
    optionId,
    optionCode,
    optionDetailId,
    optionDetailCode,
    inputValue,
    esbValue,
    optionDetailTypeCode,
    amountUnitCode,
  });

  return {
    onsureProdCode: PRODUCT_CODE,
    trnnUniqNo: null,
    inqyRqstOrgnCode: null,
    designCalculateOptionDtoList: [
      option(3067, "OPT00001", null, null, birthDate, null, null),
      option(3068, "OPT00004", 8323, 5, "", "10000000"),
      option(3069, "OPT00006", 8332, 33, "", "X100"),
      option(
        3070,
        "OPT00003",
        condition.genderOptionDetailId,
        condition.genderOptionDetailCode,
        "",
        condition.genderEsbValue,
      ),
      option(3071, "OPT00007", 8338, 43, "", "N20"),
      option(
        3072,
        "OPT00002",
        variant.smokingOptionDetailId,
        variant.smokingOptionDetailCode,
        "",
        "",
      ),
    ],
  };
}

async function fetchOfficialProductData(timeoutMs) {
  const response = await fetchWithTimeout(
    PRODUCT_PAGE_URL,
    { headers: buildHeaders("html") },
    timeoutMs,
  );
  const html = await response.text();
  const nextData = extractNextData(html);
  const productData = findProductData(nextData);

  if (!productData) {
    throw new Error("Unable to find CMS product data in Hanwha product page");
  }

  const examples = productData.CMS_premiumExList.flatMap((premiumExample) =>
    premiumExample.girdData.map((row) => ({
      sex_label: String(row.xVal),
      age: Number(row.yVal),
      premium_text: formatPremiumKrw(Number(row.itemVal)),
      monthly_premium_krw: Number(row.itemVal),
    })),
  );

  return {
    httpStatus: response.status,
    productInfo: productData.CMS_prdInfo,
    examples,
  };
}

async function calculateQuote(condition, variant, asOfDate, timeoutMs) {
  const birthDate = buildBirthDate(asOfDate, condition.age);
  const payload = buildCalculatePayload(condition, variant, birthDate);
  const quoteParamsJson = JSON.stringify(payload);
  const response = await fetchWithTimeout(
    CALCULATE_URL,
    {
      method: "POST",
      headers: buildHeaders("json"),
      body: quoteParamsJson,
    },
    timeoutMs,
  );
  const responseText = await response.text();
  const responseJson = JSON.parse(responseText);
  const premiumText = responseJson.returnData?.insureFee;
  const monthlyPremiumKrw = normalizePremiumKrw(premiumText);

  if (responseJson.returnCode !== "00" || !monthlyPremiumKrw) {
    throw new Error(
      `Hanwha quote failed for ${variant.productVariant}/${condition.conditionId}: ${responseJson.returnCode}`,
    );
  }

  const stableQuotePayload = JSON.stringify({
    source_id: variant.sourceId,
    condition_id: condition.conditionId,
    product_variant: variant.productVariant,
    premium_text: premiumText,
    monthly_premium_krw: monthlyPremiumKrw,
    guide_fee_description: responseJson.returnData?.guideFeeDescription,
    quote_source_url: CALCULATE_URL,
  });

  return {
    source_id: variant.sourceId,
    provider: variant.provider,
    raw_product_name: variant.rawProductName,
    product_variant: variant.productVariant,
    e_insmarket_product_code: variant.eInsmarketProductCode,
    condition_id: condition.conditionId,
    age: condition.age,
    sex: condition.sex,
    birth_date: birthDate,
    premium_text: premiumText,
    monthly_premium_krw: monthlyPremiumKrw,
    quote_source_type: "carrier_quote",
    quote_source_url: CALCULATE_URL,
    quote_params_json: quoteParamsJson,
    quote_hash_sha256: sha256(stableQuotePayload),
    api_response_hash_sha256: sha256(responseText),
    http_status: response.status,
    response_return_code: responseJson.returnCode,
    guide_fee_description: responseJson.returnData.guideFeeDescription,
    review_status_recommendation: "needs_review",
  };
}

function findExample(examples, sexLabel, age) {
  return examples.find(
    (example) => example.sex_label === sexLabel && example.age === age,
  );
}

function toCsv(rows) {
  const columns = [
    "source_id",
    "provider",
    "raw_product_name",
    "product_variant",
    "e_insmarket_product_code",
    "condition_id",
    "age",
    "sex",
    "birth_date",
    "premium_text",
    "monthly_premium_krw",
    "quote_source_type",
    "quote_hash_sha256",
    "api_response_hash_sha256",
    "guide_fee_description",
  ];

  const escapeCell = (value) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };

  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(",")),
    "",
  ].join("\n");
}

async function writeJson(path, value) {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCsv(path, value) {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const productData = await fetchOfficialProductData(args.timeoutMs);

  const quoteRows = [];
  for (const variant of SOURCE_VARIANTS) {
    for (const condition of CONDITIONS) {
      quoteRows.push(
        await calculateQuote(condition, variant, args.asOfDate, args.timeoutMs),
      );
    }
  }

  const male40Standard = await calculateQuote(
    {
      ...CONDITIONS[0],
      conditionId: "page_sample_age40_male",
      age: 40,
    },
    SOURCE_VARIANTS[0],
    args.asOfDate,
    args.timeoutMs,
  );
  const female40Standard = await calculateQuote(
    {
      ...CONDITIONS[1],
      conditionId: "page_sample_age40_female",
      age: 40,
    },
    SOURCE_VARIANTS[0],
    args.asOfDate,
    args.timeoutMs,
  );

  const male40Page = findExample(productData.examples, "남자", 40);
  const female40Page = findExample(productData.examples, "여자", 40);
  const output = {
    metadata: {
      generated_at: DateTime.now().setZone(TIMEZONE).toISO(),
      timezone: TIMEZONE,
      generator: "scripts/insurance/probe-hanwha-life-quotes.mjs",
      output_version: "1.0",
      as_of_date: args.asOfDate,
      product_page_url: PRODUCT_PAGE_URL,
      calculate_api_url: CALCULATE_URL,
      product_code: PRODUCT_CODE,
      product_name: productData.productInfo.prdName,
      product_version: productData.productInfo.prdVer,
      product_reference_date: productData.productInfo.referenceDate,
    },
    quote_basis: {
      guarantee_amount_krw: 10_000_000,
      insurance_term: "X100",
      insurance_term_label: "100세 만기",
      payment_term: "N20",
      payment_term_label: "20년납",
      payment_cycle: "월납",
      source_type: "carrier_quote",
    },
    official_page_examples: productData.examples,
    validation: {
      official_page_http_status: productData.httpStatus,
      page_examples_found: productData.examples.length,
      male_40_standard_matches_page:
        male40Page?.monthly_premium_krw === male40Standard.monthly_premium_krw,
      female_40_standard_matches_page:
        female40Page?.monthly_premium_krw === female40Standard.monthly_premium_krw,
    },
    quote_rows: quoteRows,
    qa: {
      e_insmarket_zero_quote_rows: 8,
      carrier_numeric_quote_rows: quoteRows.length,
      blocker_resolved: quoteRows.length === 8,
      next_actions: [
        "Review carrier_quote rows and update seed.ts insurance_premium_quotes entries for Hanwha Life standard/nonsmoker sources.",
        "Promote Hanwha Life source status only after quote rows are approved and representative premium basis is documented.",
        "Run DB backup before applying any seed change to production Turso.",
      ],
    },
  };

  const parsedOutput = OutputSchema.parse(output);
  await writeJson(args.outJson, parsedOutput);
  await writeCsv(args.outCsv, toCsv(parsedOutput.quote_rows));

  console.log(
    JSON.stringify(
      {
        out_json: args.outJson,
        out_csv: args.outCsv,
        product_version: parsedOutput.metadata.product_version,
        quote_rows: parsedOutput.quote_rows.length,
        numeric_quote_rows: parsedOutput.quote_rows.filter(
          (row) => row.monthly_premium_krw > 0,
        ).length,
        male_40_standard_matches_page:
          parsedOutput.validation.male_40_standard_matches_page,
        female_40_standard_matches_page:
          parsedOutput.validation.female_40_standard_matches_page,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
