#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_OUT = "data/insurance/latest_official_sources_snapshot.json";
const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; official-source-collector)";

const SOURCE_URLS = {
  kliaMembers: "https://www.klia.or.kr/klia/company/member/list.do",
  kniaMembers: "https://www.knia.or.kr/about/partner/partner01",
  kniaLostHealth:
    "https://kpub.knia.or.kr/productDisc/lostHealth/lostHealthDisclosure.do",
  epostOpenApi: "https://www.epostlife.go.kr/IPUIOP0000.do",
  samsungLifePdf:
    "https://www.samsunglife.com/dcms/down/w3sli/disclosure/disclosure_guide.pdf",
};

const E_INSMARKET_BASE_URL = "https://e-insmarket.or.kr";
const E_INSMARKET_CATEGORIES = [
  {
    key: "e_insmarket_cancer",
    sourceId: "e_insmarket_cancer_mobile",
    name: "보험다모아 모바일 암보험 상품비교",
    productGroup: "암보험",
    sourceUrl:
      `${E_INSMARKET_BASE_URL}/m/cancerIns/cancerInsList.knia?action=search&age=34&enterType=A&indemnityTypeA=1&prdtSmlClsCd=D001&renewTypeA=C1&renewTypeB=&sex=2`,
    method: "GET",
    parser: "card",
    basis:
      "보험다모아 모바일 암보험 비교 URL parameters: age=34, sex=2, enterType=A, indemnityTypeA=1, prdtSmlClsCd=D001, renewTypeA=C1",
  },
  {
    key: "e_insmarket_medical_5th",
    sourceId: "e_insmarket_medical_5th_mobile",
    name: "보험다모아 모바일 5세대 실손의료보험 상품비교",
    productGroup: "실손의료보험",
    sourceUrl: `${E_INSMARKET_BASE_URL}/m/mins/minsInsList.knia`,
    method: "POST",
    parser: "medical",
    body: [
      ["prdtSmlClsCd", "G004"],
      ["sexDiv", "M"],
      ["age", "34"],
      ["sex", "M"],
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
    ],
    basis:
      "보험다모아 모바일 5세대 실손의료보험 POST parameters: age=34, sex=M, prdtSmlClsCd=G004, realLossDivCd=3, basic coverage A/B, listed non-life insurers",
  },
  {
    key: "e_insmarket_medical_impaired",
    sourceId: "e_insmarket_medical_impaired_mobile",
    name: "보험다모아 모바일 유병력자실손의료보험 상품비교",
    productGroup: "유병력자실손의료보험",
    sourceUrl: `${E_INSMARKET_BASE_URL}/m/mins/minsInsList.knia`,
    method: "POST",
    parser: "medical",
    body: [
      ["prdtSmlClsCd", "G002"],
      ["sexDiv", "M"],
      ["age", "34"],
      ["sex", "M"],
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
      ["joinScrtDivCd", "C"],
      ["joinScrtDivCd", "D"],
    ],
    basis:
      "보험다모아 모바일 유병력자실손의료보험 POST parameters: age=34, sex=M, prdtSmlClsCd=G002, realLossDivCd=3, coverage A/B/C/D, listed non-life insurers",
  },
  {
    key: "e_insmarket_disease",
    sourceId: "e_insmarket_disease_mobile",
    name: "보험다모아 모바일 질병보험 상품비교",
    productGroup: "질병보험",
    sourceUrl: `${E_INSMARKET_BASE_URL}/m/guaranteeIns/guaranteeInsList.knia?menuId=C001`,
    method: "GET",
    parser: "card",
    basis:
      "보험다모아 모바일 보장성보험 > 질병보험 default search parameters: menuId=C001",
  },
  {
    key: "e_insmarket_nursing_dementia",
    sourceId: "e_insmarket_nursing_dementia_mobile",
    name: "보험다모아 모바일 간병/치매보험 상품비교",
    productGroup: "간병/치매보험",
    sourceUrl: `${E_INSMARKET_BASE_URL}/m/guaranteeIns/guaranteeInsList.knia?menuId=C012`,
    method: "GET",
    parser: "card",
    basis:
      "보험다모아 모바일 보장성보험 > 간병/치매보험 default search parameters: menuId=C012",
  },
];

const SourceStatusSchema = z.object({
  source_id: z.string(),
  name: z.string(),
  url: z.string().url(),
  method: z.string(),
  status: z.string(),
  http_status: z.number().int().nullable(),
  evidence: z.string(),
  error: z.string().optional(),
});

const CarrierSchema = z.object({
  name_ko: z.string(),
  homepage_url: z.string(),
  carrier_type: z.string(),
  source_id: z.string(),
});

const ProductSchema = z.object({
  rank: z.number().int(),
  provider: z.string(),
  raw_product_name: z.string(),
  premium_text: z.string(),
  source_id: z.string(),
  source_url: z.string().url(),
  product_group: z.string(),
  official_product_url: z.string().url().nullable(),
  e_insmarket_product_code: z.string().nullable(),
  review_status: z.string(),
});

const ProductSampleSchema = z.object({
  source_id: z.string(),
  source_url: z.string().url(),
  product_group: z.string(),
  basis: z.string(),
  count: z.number().int(),
  products: z.array(ProductSchema),
});

const SnapshotSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    output_version: z.string(),
  }),
  source_status: z.array(SourceStatusSchema),
  carriers: z.object({
    life_product_carriers: z.array(CarrierSchema),
    life_non_primary_members: z.array(CarrierSchema),
    general_primary_carriers: z.array(CarrierSchema),
    general_non_primary_members: z.array(CarrierSchema),
  }),
  product_samples: z.record(z.string(), ProductSampleSchema),
  api_candidates: z.array(
    z.object({
      source_id: z.string(),
      name: z.string(),
      endpoint: z.string(),
      auth_requirement: z.string(),
    }),
  ),
  qa: z.object({
    service_db_ready: z.boolean(),
    blockers: z.array(z.string()),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
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
  node scripts/insurance/collect-official-sources.mjs [--out path] [--timeout-ms 30000]

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

function normalizeUrl(rawUrl, baseUrl) {
  const value = cleanText(rawUrl);
  if (value.startsWith("//")) {
    return `https:${value}`;
  }
  return new URL(value, baseUrl).toString();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      body: options.body,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          options.method === "HEAD"
            ? "*/*"
            : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: options.redirect ?? "follow",
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, timeoutMs, options = {}) {
  const response = await fetchWithTimeout(url, {
    method: options.method,
    body: options.body,
    timeoutMs,
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text,
  };
}

async function safeCollect(sourceId, name, url, method, collectFn) {
  try {
    const result = await collectFn();
    return {
      status: {
        source_id: sourceId,
        name,
        url,
        method,
        status: result.ok ? "accessible" : "http_error",
        http_status: result.httpStatus,
        evidence: result.evidence,
      },
      data: result.data,
    };
  } catch (error) {
    return {
      status: {
        source_id: sourceId,
        name,
        url,
        method,
        status: "failed",
        http_status: null,
        evidence: "Collection failed before parser could produce evidence.",
        error: error instanceof Error ? error.message : String(error),
      },
      data: null,
    };
  }
}

function classifyKliaMember(name) {
  if (name.includes("재보험")) {
    return "reinsurance";
  }
  if (
    name.includes("금융서비스") ||
    name.includes("라이프랩") ||
    name.includes("파트너스")
  ) {
    return "agency";
  }
  return "life";
}

function parseKliaMembers(html, sourceId, baseUrl) {
  const carriers = [];
  const pattern = /<a\s+href="([^"]+)"[^>]*>\s*<img[^>]*alt="([^"]+)"/gi;
  const excludedNames = new Set(["생명보험협회", "닫기", "개인정보취급방침 닫기"]);

  for (const match of html.matchAll(pattern)) {
    const name = cleanText(match[2]).replace(/_?이미지$/u, "");
    const homepageUrl = normalizeUrl(match[1], baseUrl);
    const isFooterBadge =
      name.includes("web accessibility") ||
      name.includes("web award") ||
      name.includes("과학기술정보통신부");

    if (
      !name ||
      excludedNames.has(name) ||
      isFooterBadge ||
      !homepageUrl.startsWith("http")
    ) {
      continue;
    }

    carriers.push({
      name_ko: name,
      homepage_url: homepageUrl,
      carrier_type: classifyKliaMember(name),
      source_id: sourceId,
    });
  }

  return uniqueBy(carriers, (carrier) => carrier.name_ko);
}

function classifyKniaMember(name) {
  const isReinsurance =
    (name.includes("재보험") && !name.includes("화재보험")) ||
    name.includes("Munich") ||
    name.includes("Swiss") ||
    name.includes("RGA") ||
    name.includes("SCOR") ||
    name.includes("하노버재보험") ||
    name.includes("퍼시픽라이프리");

  if (isReinsurance) {
    return "reinsurance";
  }
  if (name.includes("서울보증")) {
    return "surety";
  }
  if (
    name.includes("손해보험") ||
    name.includes("화재") ||
    name.includes("AXA") ||
    name.includes("AIG") ||
    name.includes("농협손해") ||
    name.includes("카카오페이손해") ||
    name.includes("MG손해")
  ) {
    return "general";
  }
  return "specialty_or_foreign";
}

function parseKniaMembers(html, sourceId, baseUrl) {
  const carriers = [];
  const pattern =
    /<p class="logo"><img[^>]*alt="([^"]+)"[^>]*><\/p>[\s\S]*?<button[^>]+onclick="window\.open\('([^']+)'/gi;

  for (const match of html.matchAll(pattern)) {
    const name = cleanText(match[1]);
    if (!name) {
      continue;
    }

    carriers.push({
      name_ko: name,
      homepage_url: normalizeUrl(match[2], baseUrl),
      carrier_type: classifyKniaMember(name),
      source_id: sourceId,
    });
  }

  return uniqueBy(carriers, (carrier) => carrier.name_ko);
}

function parseKniaLostHealthInsurers(html) {
  const knownNames = [
    "메리츠화재",
    "한화손해보험",
    "롯데손해보험",
    "흥국화재",
    "삼성화재",
    "현대해상",
    "KB손해보험",
    "DB손해보험",
    "AXA손해보험",
    "AIG손해보험",
    "하나손해보험",
    "농협손해보험",
    "카카오페이손해보험",
    "MG손해보험",
  ];

  return knownNames.filter((name) => html.includes(name));
}

function parseEInsmarketCardProducts(html, category) {
  const products = [];
  const pattern =
    /<div class="logo">[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?<span class="name"><em>([\s\S]*?)<\/em>([\s\S]*?)<div class="hidden">[\s\S]*?<span id="prdtCd">([^<]*)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    const productBody = match[3];
    const premiumMatch = productBody.match(
      /<span class="cost">보험료<strong>([\s\S]*?)<\/strong>/i,
    );
    const linkFields = parseProductLinkFields(productBody, match[4]);

    products.push({
      rank: products.length + 1,
      provider: cleanText(match[1]),
      raw_product_name: cleanText(match[2]),
      premium_text: premiumMatch ? cleanText(premiumMatch[1]) : "",
      source_id: category.sourceId,
      source_url: category.sourceUrl,
      product_group: category.productGroup,
      ...linkFields,
      review_status: "raw",
    });
  }

  return products;
}

function parseEInsmarketMedicalProducts(html, category) {
  const products = [];
  const pattern =
    /<div class="logo">[\s\S]*?<img[^>]*alt="([^"]+)"[\s\S]*?<span class="name"><em>([\s\S]*?)<\/em>([\s\S]*?)<div class="hidden">[\s\S]*?<span id="prdtCd">([^<]*)<\/span>/gi;

  for (const match of html.matchAll(pattern)) {
    const productBody = match[3];
    const premiumMatch = productBody.match(/<strong id="[^"]+">([\s\S]*?)<\/strong>/i);
    const linkFields = parseProductLinkFields(productBody, match[4]);

    products.push({
      rank: products.length + 1,
      provider: cleanText(match[1]),
      raw_product_name: cleanText(match[2]),
      premium_text: premiumMatch ? cleanText(premiumMatch[1]) : "",
      source_id: category.sourceId,
      source_url: category.sourceUrl,
      product_group: category.productGroup,
      ...linkFields,
      review_status: "raw",
    });
  }

  return products;
}

function parseProductLinkFields(productBody, fallbackCode) {
  const linkMatch = productBody.match(/linkInsu\('([^']*)',\s*'([^']*)'\)/i);
  const officialProductUrl = normalizeHttpUrl(linkMatch?.[1]);

  return {
    official_product_url: officialProductUrl,
    e_insmarket_product_code: cleanText(linkMatch?.[2] ?? fallbackCode) || null,
  };
}

function normalizeHttpUrl(value) {
  const cleaned = cleanText(value ?? "");
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    return null;
  }

  try {
    return new URL(cleaned).toString();
  } catch {
    return null;
  }
}

function parseEpostOpenApiEndpoints(html, sourceId) {
  const endpoints = [
    ...html.matchAll(/http:\/\/apis\.data\.go\.kr\/1721301\/[A-Za-z0-9/]+/g),
  ].map((match) => match[0]);

  return [...new Set(endpoints)].map((endpoint) => ({
    source_id: sourceId,
    name: endpoint.includes("FeeCalculation")
      ? "우체국보험 1회 보험료 조회"
      : "우체국보험 보험상품정보 조회",
    endpoint,
    auth_requirement: "data.go.kr service key required",
  }));
}

async function collectKliaMembers(timeoutMs) {
  const sourceId = "klia_member_list";
  const response = await fetchText(SOURCE_URLS.kliaMembers, timeoutMs);
  const carriers = parseKliaMembers(response.text, sourceId, SOURCE_URLS.kliaMembers);

  return {
    ok: response.ok && carriers.length > 0,
    httpStatus: response.status,
    evidence: `Extracted ${carriers.length} KLIA member records from HTML.`,
    data: carriers,
  };
}

async function collectKniaMembers(timeoutMs) {
  const sourceId = "knia_member_list";
  const response = await fetchText(SOURCE_URLS.kniaMembers, timeoutMs);
  const carriers = parseKniaMembers(response.text, sourceId, SOURCE_URLS.kniaMembers);

  return {
    ok: response.ok && carriers.length > 0,
    httpStatus: response.status,
    evidence: `Extracted ${carriers.length} KNIA member records from HTML.`,
    data: carriers,
  };
}

async function collectKniaLostHealth(timeoutMs) {
  const response = await fetchText(SOURCE_URLS.kniaLostHealth, timeoutMs);
  const insurerNames = parseKniaLostHealthInsurers(response.text);

  return {
    ok: response.ok && insurerNames.length > 0,
    httpStatus: response.status,
    evidence: `Detected ${insurerNames.length} insurer names on lost-health disclosure page.`,
    data: insurerNames,
  };
}

async function collectEInsmarketCategory(category, timeoutMs) {
  const body = category.body ? new URLSearchParams(category.body) : undefined;
  const response = await fetchText(category.sourceUrl, timeoutMs, {
    method: category.method,
    body,
  });
  const products =
    category.parser === "medical"
      ? parseEInsmarketMedicalProducts(response.text, category)
      : parseEInsmarketCardProducts(response.text, category);

  return {
    ok: response.ok && products.length > 0,
    httpStatus: response.status,
    evidence: `Extracted ${products.length} ${category.productGroup} product rows from HTML.`,
    data: products,
  };
}

async function collectEpostOpenApi(timeoutMs) {
  const sourceId = "epostlife_openapi_info";
  const response = await fetchText(SOURCE_URLS.epostOpenApi, timeoutMs);
  const endpoints = parseEpostOpenApiEndpoints(response.text, sourceId);

  return {
    ok: response.ok && endpoints.length > 0,
    httpStatus: response.status,
    evidence: `Detected ${endpoints.length} Korea Post insurance OpenAPI endpoint candidates.`,
    data: endpoints,
  };
}

async function collectSamsungLifePdf(timeoutMs) {
  const response = await fetchWithTimeout(SOURCE_URLS.samsungLifePdf, {
    method: "HEAD",
    timeoutMs,
  });

  const evidence = [
    `content-type=${response.headers.get("content-type") ?? "unknown"}`,
    `content-length=${response.headers.get("content-length") ?? "unknown"}`,
    `last-modified=${response.headers.get("last-modified") ?? "unknown"}`,
  ].join("; ");

  return {
    ok: response.ok,
    httpStatus: response.status,
    evidence,
    data: {
      content_type: response.headers.get("content-type"),
      content_length_bytes: Number(response.headers.get("content-length") ?? 0),
      last_modified: response.headers.get("last-modified"),
    },
  };
}

async function buildSnapshot(timeoutMs) {
  const [
    kliaResult,
    kniaResult,
    lostHealthResult,
    epostResult,
    samsungPdfResult,
    ...eInsmarketResults
  ] = await Promise.all([
    safeCollect(
      "klia_member_list",
      "생명보험협회 회원사 안내",
      SOURCE_URLS.kliaMembers,
      "GET HTML",
      () => collectKliaMembers(timeoutMs),
    ),
    safeCollect(
      "knia_member_list",
      "손해보험협회 회원사",
      SOURCE_URLS.kniaMembers,
      "GET HTML",
      () => collectKniaMembers(timeoutMs),
    ),
    safeCollect(
      "knia_lost_health_disclosure",
      "손해보험협회 실손의료보험 공시",
      SOURCE_URLS.kniaLostHealth,
      "GET HTML",
      () => collectKniaLostHealth(timeoutMs),
    ),
    safeCollect(
      "epostlife_openapi_info",
      "우체국금융 보험상품 OpenAPI 안내",
      SOURCE_URLS.epostOpenApi,
      "GET HTML",
      () => collectEpostOpenApi(timeoutMs),
    ),
    safeCollect(
      "samsunglife_pdf_probe",
      "삼성생명 공개 PDF 접근성 확인",
      SOURCE_URLS.samsungLifePdf,
      "HEAD PDF",
      () => collectSamsungLifePdf(timeoutMs),
    ),
    ...E_INSMARKET_CATEGORIES.map((category) =>
      safeCollect(
        category.sourceId,
        category.name,
        category.sourceUrl,
        `${category.method} HTML`,
        () => collectEInsmarketCategory(category, timeoutMs),
      ),
    ),
  ]);

  const kliaCarriers = kliaResult.data ?? [];
  const kniaCarriers = kniaResult.data ?? [];
  const apiCandidates = epostResult.data ?? [];
  const productSamples = Object.fromEntries(
    E_INSMARKET_CATEGORIES.map((category, index) => {
      const products = eInsmarketResults[index]?.data ?? [];

      return [
        category.key,
        {
          source_id: category.sourceId,
          source_url: category.sourceUrl,
          product_group: category.productGroup,
          basis: category.basis,
          count: products.length,
          products,
        },
      ];
    }),
  );

  const snapshot = {
    metadata: {
      generated_at: DateTime.now().setZone("Asia/Seoul").toISO(),
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/collect-official-sources.mjs",
      output_version: "1.1",
    },
    source_status: [
      kliaResult.status,
      kniaResult.status,
      lostHealthResult.status,
      ...eInsmarketResults.map((result) => result.status),
      epostResult.status,
      samsungPdfResult.status,
    ],
    carriers: {
      life_product_carriers: kliaCarriers.filter(
        (carrier) => carrier.carrier_type === "life",
      ),
      life_non_primary_members: kliaCarriers.filter(
        (carrier) => carrier.carrier_type !== "life",
      ),
      general_primary_carriers: kniaCarriers.filter(
        (carrier) => carrier.carrier_type === "general",
      ),
      general_non_primary_members: kniaCarriers.filter(
        (carrier) => carrier.carrier_type !== "general",
      ),
    },
    product_samples: productSamples,
    api_candidates: apiCandidates,
    qa: {
      service_db_ready: false,
      blockers: [
        "data.go.kr service key is required before Korea Post API calls can be verified.",
        "Product-specific terms, summary PDFs, sale status, premium basis, coverage_category, and risk_targets still require review.",
        "Insurance recommendation DB must not consume raw product rows before human approval.",
      ],
      next_actions: [
        "Discover product-specific carrier PDF URLs and store source_url plus response hash.",
        "Create a human review CSV or admin workflow for coverage_category and risk_targets approval.",
        "Verify Korea Post OpenAPI calls after a data.go.kr service key is configured.",
      ],
    },
  };

  return SnapshotSchema.parse(snapshot);
}

async function writeSnapshot(snapshot, outPath) {
  const absoluteOut = resolve(process.cwd(), outPath);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return absoluteOut;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshot = await buildSnapshot(args.timeoutMs);
  const absoluteOut = await writeSnapshot(snapshot, args.out);

  console.log(`Insurance source snapshot written: ${absoluteOut}`);
  console.log(
    [
      `life_product_carriers=${snapshot.carriers.life_product_carriers.length}`,
      `general_primary_carriers=${snapshot.carriers.general_primary_carriers.length}`,
      `product_categories=${Object.keys(snapshot.product_samples).length}`,
      `product_rows=${Object.values(snapshot.product_samples).reduce(
        (sum, sample) => sum + sample.count,
        0,
      )}`,
      `api_candidates=${snapshot.api_candidates.length}`,
    ].join(" "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
