#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_PRODUCT_PROBE = "data/insurance/latest_product_document_probe.json";
const DEFAULT_OUT = "data/insurance/latest_carrier_disclosure_probe.json";
const DEFAULT_LIMIT = 12;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DOCUMENTS_PER_PRODUCT = 5;
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const DISCLOSURE_MATCH_THRESHOLD = 0.5;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; carrier-disclosure-crawler)";

const COMMON_TOKENS = new Set([
  "무배당",
  "보험",
  "보험약관",
  "약관",
  "상품",
  "상품요약서",
  "요약서",
  "상품설명서",
  "설명서",
  "사업방법서",
  "다이렉트",
  "갱신형",
  "자동갱신형",
  "해약환급금",
  "미지급형",
  "무해약환급금형",
]);

const CARRIER_PROFILES = {
  "DB생명": {
    provider: "DB생명",
    source_url: "https://idblife.com/notice/product/sale",
    notes: ["판매상품공시 표가 서버 렌더링 HTML로 노출된다."],
  },
  "삼성화재": {
    provider: "삼성화재",
    source_url: "https://www.samsungfire.com/publication/P_U02_05_16_262.html",
    seed_documents: [
      {
        url: "https://direct.samsungfire.com/docs/realloss.pdf",
        document_type: "terms",
        keywords: ["실손의료비보험"],
        source_context:
          "삼성화재 다이렉트 공식 docs 경로의 2605.1 실손의료비보험 약관 PDF 후보",
      },
    ],
    notes: [
      "상품목록 페이지는 상품명과 판매중지일 중심으로 노출되며 문서 링크가 분리되어 있을 수 있다.",
    ],
  },
  현대해상: {
    provider: "현대해상",
    source_url: "https://www.hi.co.kr/bin/CI/ON/CION3200G.jsp",
    notes: ["상품공시 검색 화면은 JavaScript 검색 결과와 다운로드 버튼을 함께 사용한다."],
  },
  KB손보: {
    provider: "KB손보",
    source_url: "https://www.kbinsure.co.kr/CG804030001.ec",
    notes: ["KB손보 공시 페이지 일부는 EUC-KR 인코딩이며 문서 다운로드는 별도 fileNm 경로를 사용한다."],
  },
  DB손보: {
    provider: "DB손보",
    source_url: "https://www.idbins.com/FWMAIV1534.do",
    api_searches: [
      {
        kind: "dbins_product_search",
        endpoint: "https://www.idbins.com/insuPcPbanFindProductStep5_AX.do",
        keyword: "다이렉트 실손의료비보험",
        screen_id: "FWMAIL6337",
      },
    ],
    notes: [
      "상품목록 및 기초서류 화면의 JavaScript 검색 API로 상품명과 PDF 파일명을 조회한다.",
    ],
  },
  신한라이프생명: {
    provider: "신한라이프생명",
    source_url: "https://shinhanlife.co.kr/hp/cdhi0010.do",
    notes: ["대표 공시실 진입 페이지에서 상품공시 하위 경로를 추가 추적해야 한다."],
  },
  삼성생명: {
    provider: "삼성생명",
    source_url: "https://www.samsunglife.com",
    notes: ["삼성생명 대표 사이트는 상품공시가 JavaScript 앱 내부에 있을 수 있다."],
  },
};

const DisclosureProbeSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    input_product_probe: z.string(),
    output_version: z.string(),
    target_limit: z.number().int(),
    max_documents_per_product: z.number().int(),
  }),
  targets: z.array(
    z.object({
      provider: z.string(),
      product_group: z.string(),
      raw_product_name: z.string(),
      premium_text: z.string(),
      e_insmarket_product_code: z.string().nullable(),
      official_product_url: z.string().url(),
    }),
  ),
  carrier_pages: z.array(
    z.object({
      provider: z.string(),
      source_url: z.string().url(),
      page_status: z.string(),
      http_status: z.number().int().nullable(),
      final_url: z.string().nullable(),
      content_type: z.string().nullable(),
      charset: z.string().nullable(),
      disclosure_record_count: z.number().int(),
      matched_product_count: z.number().int(),
      notes: z.array(z.string()),
      error: z.string().optional(),
    }),
  ),
  product_results: z.array(
    z.object({
      provider: z.string(),
      product_group: z.string(),
      raw_product_name: z.string(),
      premium_text: z.string(),
      e_insmarket_product_code: z.string().nullable(),
      official_product_url: z.string().url(),
      carrier_disclosure_url: z.string().url().nullable(),
      result_status: z.string(),
      best_match_score: z.number(),
      matched_record_text: z.string().nullable(),
      document_candidates: z.array(
        z.object({
          url: z.string().url(),
          document_type: z.string(),
          discovered_from: z.string(),
          source_context: z.string(),
          status: z.string(),
          http_status: z.number().int().nullable(),
          content_type: z.string().nullable(),
          content_length_bytes: z.number().int().nullable(),
          sha256: z.string().nullable(),
          retrieved_at: z.string().nullable(),
          error: z.string().optional(),
        }),
      ),
      notes: z.array(z.string()),
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
    productProbe: DEFAULT_PRODUCT_PROBE,
    out: DEFAULT_OUT,
    limit: DEFAULT_LIMIT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxDocumentsPerProduct: DEFAULT_MAX_DOCUMENTS_PER_PRODUCT,
    maxPdfBytes: DEFAULT_MAX_PDF_BYTES,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--product-probe") {
      args.productProbe = argv[i + 1];
      i += 1;
    } else if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "--limit") {
      args.limit = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--max-documents-per-product") {
      args.maxDocumentsPerProduct = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--max-pdf-bytes") {
      args.maxPdfBytes = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const key of ["limit", "timeoutMs", "maxDocumentsPerProduct", "maxPdfBytes"]) {
    if (!Number.isInteger(args[key]) || args[key] <= 0) {
      throw new Error(`--${toKebabCase(key)} must be a positive integer`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/collect-carrier-disclosures.mjs [--product-probe path] [--out path] [--limit 12]

Default input:
  ${DEFAULT_PRODUCT_PROBE}

Default output:
  ${DEFAULT_OUT}
`);
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      body: options.body,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: options.accept ?? "*/*",
        ...(options.contentType ? { "Content-Type": options.contentType } : {}),
        ...(options.headers ?? {}),
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function selectTargets(productProbe, limit) {
  const selectedProducts = productProbe.probes ?? [];
  const targets = [];
  const seen = new Set();

  for (const product of selectedProducts) {
    const hasHash = (product.pdf_candidates ?? []).some(
      (candidate) => candidate.status === "hashed",
    );
    if (hasHash || !product.official_product_url) {
      continue;
    }

    const key = `${product.provider}|${product.raw_product_name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push({
      provider: product.provider,
      product_group: product.product_group,
      raw_product_name: product.raw_product_name,
      premium_text: product.premium_text,
      e_insmarket_product_code: product.e_insmarket_product_code ?? null,
      official_product_url: product.official_product_url,
    });

    if (targets.length >= limit) {
      break;
    }
  }

  return targets;
}

async function loadCarrierPage(profile, options) {
  const basePage = {
    provider: profile.provider,
    source_url: profile.source_url,
    page_status: "failed",
    http_status: null,
    final_url: null,
    content_type: null,
    charset: null,
    disclosure_record_count: 0,
    matched_product_count: 0,
    notes: [...(profile.notes ?? [])],
    records: [],
  };

  try {
    const response = await fetchWithTimeout(profile.source_url, {
      timeoutMs: options.timeoutMs,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    const charset = parseCharset(contentType);
    const html = decodeHtml(buffer, charset);
    const htmlRecords = extractDisclosureRecords(html, response.url);
    const apiCollection = await collectApiRecords(profile, options);
    const records = [...htmlRecords, ...apiCollection.records];

    return {
      ...basePage,
      page_status: response.ok ? "accessible" : "http_error",
      http_status: response.status,
      final_url: response.url,
      content_type: contentType,
      charset,
      disclosure_record_count: records.length,
      notes: [...basePage.notes, ...apiCollection.notes],
      records,
    };
  } catch (error) {
    return {
      ...basePage,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectApiRecords(profile, options) {
  const records = [];
  const notes = [];

  for (const search of profile.api_searches ?? []) {
    if (search.kind !== "dbins_product_search") {
      notes.push(`Unsupported API search kind: ${search.kind}`);
      continue;
    }

    try {
      const apiRecords = await fetchDbInsuranceProductRecords(search, options);
      records.push(...apiRecords);
      notes.push(`DB손보 API search '${search.keyword}' returned ${apiRecords.length} records.`);
    } catch (error) {
      notes.push(
        `DB손보 API search '${search.keyword}' failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return { records, notes };
}

async function fetchDbInsuranceProductRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json,text/plain,*/*",
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({
      searchCheck: "0",
      keyword: search.keyword,
      beginDate: "",
      endDate: "",
      screenId: search.screen_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  return (payload.result ?? []).map((record) => {
    const links = makeDbInsuranceDocumentLinks(record, search.endpoint);
    return {
      text: cleanText(
        [
          record.ARC_KND_LGCG_NM,
          record.PDC_NM,
          record.SALE_BEGIN_DAY,
          record.ARC_PDC_SL_YN === "1" ? "판매중" : "판매중지",
          record.INPL_FINM,
          record.BIZ_MDDC_FINM,
          record.CNSL_SMAR_FINM,
          record.PDC_EXPP_FINM,
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links,
    };
  });
}

function makeDbInsuranceDocumentLinks(record, discoveredFrom) {
  return [
    ["terms", record.INPL_FINM, "상품약관"],
    ["business_method", record.BIZ_MDDC_FINM, "사업방법서"],
    ["summary", record.CNSL_SMAR_FINM, "상품요약서"],
    ["product_explanation", record.PDC_EXPP_FINM, "상품설명서"],
  ]
    .filter(([, fileName]) => Boolean(fileName))
    .map(([documentType, fileName, label]) => ({
      url: `https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/${encodeURIComponent(
        fileName,
      )}`,
      href: fileName,
      text: label,
      title: `${record.PDC_NM} ${label}`,
      document_type: documentType,
      discovered_from: discoveredFrom,
    }));
}

function parseCharset(contentType) {
  const match = String(contentType ?? "").match(/charset=([^;\s]+)/i);
  return match ? match[1].trim().toLowerCase() : null;
}

function decodeHtml(buffer, charset) {
  const candidates = [
    charset,
    "utf-8",
    "euc-kr",
    "windows-949",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return new TextDecoder(candidate).decode(buffer);
    } catch {
      // Try the next decoder.
    }
  }

  return buffer.toString("utf8");
}

function extractDisclosureRecords(html, baseUrl) {
  const records = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const rowHtml = match[1];
    const text = cleanText(rowHtml);
    if (!isPotentialDisclosureRecord(text, rowHtml)) {
      continue;
    }

    records.push({
      text,
      links: extractLinks(rowHtml, baseUrl),
    });
  }

  if (records.length > 0) {
    return records;
  }

  const fallbackLinks = extractLinks(html, baseUrl);
  return fallbackLinks
    .filter((link) => isDocumentLink(link))
    .map((link) => ({
      text: cleanText(`${link.text} ${link.title} ${link.href}`),
      links: [link],
    }));
}

function isPotentialDisclosureRecord(text, rowHtml) {
  const value = normalizeText(text);
  const htmlValue = rowHtml.toLowerCase();
  return (
    value.includes("보험") ||
    value.includes("약관") ||
    value.includes("상품요약서") ||
    value.includes("실손") ||
    htmlValue.includes(".pdf") ||
    htmlValue.includes("file/")
  );
}

function extractLinks(html, baseUrl) {
  const links = [];
  const linkPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const attrs = match[1];
    const href = readAttr(attrs, "href");
    const title = readAttr(attrs, "title");
    const text = cleanText(match[2]);
    const url = normalizeHttpUrl(href, baseUrl);

    if (!url) {
      continue;
    }

    links.push({
      url,
      href: href ?? "",
      text,
      title: title ? cleanText(title) : "",
      document_type: inferDocumentType(`${text} ${title ?? ""} ${href ?? ""}`),
    });
  }

  return links;
}

function readAttr(attrs, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = attrs.match(pattern);
  return match ? htmlDecode(match[1]).trim() : null;
}

function normalizeHttpUrl(rawUrl, baseUrl) {
  if (!rawUrl) {
    return null;
  }
  const value = htmlDecode(rawUrl).trim();
  if (!value || value.startsWith("#") || value.toLowerCase().startsWith("javascript:")) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function isDocumentLink(link) {
  const value = normalizeText(`${link.url} ${link.text} ${link.title}`);
  return (
    value.includes(".pdf") ||
    value.includes("약관") ||
    value.includes("요약서") ||
    value.includes("상품설명서") ||
    value.includes("사업방법서") ||
    value.includes("file/")
  );
}

function inferDocumentType(value) {
  const text = normalizeText(value);
  if (text.includes("요약서")) {
    return "summary";
  }
  if (text.includes("상품설명서") || text.includes("설명서")) {
    return "product_explanation";
  }
  if (text.includes("사업방법서") || text.includes("방법서")) {
    return "business_method";
  }
  if (text.includes("약관")) {
    return "terms";
  }
  if (text.includes(".pdf")) {
    return "pdf";
  }
  return "unknown";
}

function matchRecord(product, records) {
  let best = {
    score: 0,
    record: null,
  };

  for (const record of records) {
    const score = scoreTextMatch(product.raw_product_name, record.text);
    if (score > best.score) {
      best = { score, record };
    }
  }

  return best;
}

function scoreTextMatch(productName, candidateText) {
  const productTokens = tokenizeProductName(productName);
  const candidateTokens = tokenizeProductName(candidateText);
  if (productTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens);
  const overlap = productTokens.filter((token) => candidateSet.has(token));
  const overlapScore = overlap.length / Math.max(productTokens.length, 1);
  const compactProduct = compactName(productName);
  const compactCandidate = compactName(candidateText);
  const containsScore =
    compactProduct.length > 8 && compactCandidate.includes(compactProduct.slice(0, 12))
      ? 0.35
      : 0;
  const productVersions = extractVersionTokens(productName);
  const candidateVersions = extractVersionTokens(candidateText);

  let score = Math.min(1, overlapScore + containsScore);
  if (
    productVersions.length > 0 &&
    candidateVersions.length > 0 &&
    !productVersions.some((version) => candidateVersions.includes(version))
  ) {
    score = Math.min(score, 0.45);
  }

  return Number(score.toFixed(4));
}

function tokenizeProductName(value) {
  return normalizeText(value)
    .replace(/[()[\]{}]/g, " ")
    .split(/[^0-9a-zA-Z가-힣.]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !COMMON_TOKENS.has(token));
}

function extractVersionTokens(value) {
  return normalizeText(value).match(/\b\d{4}(?:\.\d+)?\b|\b\d{2}\.\d{2}\b/g) ?? [];
}

function compactName(value) {
  return normalizeText(value).replace(/[^0-9a-zA-Z가-힣]+/g, "");
}

async function probeProductDisclosure(product, carrierPage, profile, options) {
  const result = {
    ...product,
    carrier_disclosure_url: profile?.source_url ?? null,
    result_status: "no_profile",
    best_match_score: 0,
    matched_record_text: null,
    document_candidates: [],
    notes: [],
  };

  if (!profile) {
    result.notes.push("No carrier disclosure profile is configured for this provider.");
    return result;
  }

  if (!carrierPage || carrierPage.page_status !== "accessible") {
    result.result_status = "carrier_page_unavailable";
    result.notes.push("Carrier disclosure page was not accessible.");
    return result;
  }

  const bestMatch = matchRecord(product, carrierPage.records);
  const acceptedRecord = bestMatch.score >= DISCLOSURE_MATCH_THRESHOLD ? bestMatch.record : null;
  result.best_match_score = bestMatch.score;
  result.matched_record_text = acceptedRecord?.text ?? null;

  const candidateLinks = [];
  if (acceptedRecord) {
    for (const link of acceptedRecord.links.filter((candidate) => isDocumentLink(candidate))) {
      candidateLinks.push({
        url: link.url,
        document_type: link.document_type,
        discovered_from: link.discovered_from ?? profile.source_url,
        source_context: link.title || link.text || acceptedRecord.text,
      });
    }
  }

  for (const seedDocument of profile.seed_documents ?? []) {
    const score = scoreSeedDocument(product, seedDocument);
    if (score > 0) {
      candidateLinks.push({
        url: seedDocument.url,
        document_type: seedDocument.document_type,
        discovered_from: profile.source_url,
        source_context: seedDocument.source_context,
      });
      result.best_match_score = Math.max(result.best_match_score, score);
    }
  }

  const uniqueCandidates = uniqueBy(candidateLinks, (candidate) => candidate.url).slice(
    0,
    options.maxDocumentsPerProduct,
  );

  if (uniqueCandidates.length === 0) {
    result.result_status = acceptedRecord ? "matched_without_document_links" : "no_match";
    result.notes.push(
      acceptedRecord
        ? "Matched a disclosure row, but no downloadable document link was available in the HTML."
        : "No disclosure row passed the product-name matching threshold.",
    );
    return result;
  }

  const probedCandidates = [];
  for (const candidate of uniqueCandidates) {
    const probed = await probeDocumentCandidate(candidate, options);
    probedCandidates.push(probed);
  }

  result.document_candidates = probedCandidates;
  result.result_status = probedCandidates.some((candidate) => candidate.status === "hashed")
    ? "hashed"
    : "documents_found_without_hash";

  return result;
}

function scoreSeedDocument(product, seedDocument) {
  const productText = normalizeText(`${product.raw_product_name} ${product.product_group}`);
  const keywords = seedDocument.keywords ?? [];
  if (keywords.length === 0) {
    return 0.2;
  }
  return keywords.some((keyword) => productText.includes(normalizeText(keyword))) ? 0.65 : 0;
}

async function probeDocumentCandidate(candidate, options) {
  try {
    const response = await fetchWithTimeout(candidate.url, {
      timeoutMs: options.timeoutMs,
      accept: "application/pdf,text/html,application/xhtml+xml,*/*;q=0.8",
    });
    const contentType = response.headers.get("content-type");
    const contentLength = parseContentLength(response.headers.get("content-length"));

    if (!response.ok) {
      return makeDocumentCandidate(
        candidate,
        "http_error",
        response.status,
        contentType,
        contentLength,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const looksLikePdf = buffer.subarray(0, 4).toString("utf8") === "%PDF";
    const isPdf =
      looksLikePdf || String(contentType ?? "").toLowerCase().includes("application/pdf");

    if (isPdf) {
      return hashPdfBuffer(candidate, response.status, contentType, buffer, options);
    }

    const charset = parseCharset(contentType);
    const html = decodeHtml(buffer, charset);
    const nestedPdfUrls = extractPdfUrls(html, response.url);
    if (nestedPdfUrls.length === 0) {
      return makeDocumentCandidate(
        candidate,
        "non_pdf_response",
        response.status,
        contentType,
        buffer.length,
      );
    }

    const nestedCandidate = {
      ...candidate,
      url: nestedPdfUrls[0],
      discovered_from: candidate.url,
      source_context: `${candidate.source_context} > nested_pdf`,
    };

    return await probeDocumentCandidate(nestedCandidate, options);
  } catch (error) {
    return {
      ...makeDocumentCandidate(candidate, "failed", null, null, null),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function hashPdfBuffer(candidate, httpStatus, contentType, buffer, options) {
  if (buffer.length > options.maxPdfBytes) {
    return makeDocumentCandidate(
      candidate,
      "skipped_large_pdf",
      httpStatus,
      contentType,
      buffer.length,
    );
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    ...makeDocumentCandidate(candidate, "hashed", httpStatus, contentType, buffer.length),
    sha256,
    retrieved_at: DateTime.now().setZone("Asia/Seoul").toISO(),
  };
}

function extractPdfUrls(html, baseUrl) {
  const urls = new Set();
  const attrPattern = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  const stringPattern = /["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi;
  const absolutePattern = /https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/gi;

  for (const match of html.matchAll(attrPattern)) {
    addPdfUrl(urls, match[1], baseUrl);
  }
  for (const match of html.matchAll(stringPattern)) {
    addPdfUrl(urls, match[1], baseUrl);
  }
  for (const match of html.matchAll(absolutePattern)) {
    addPdfUrl(urls, match[0], baseUrl);
  }

  return [...urls];
}

function addPdfUrl(urls, rawUrl, baseUrl) {
  const cleaned = htmlDecode(String(rawUrl)).trim();
  if (!cleaned.toLowerCase().includes(".pdf")) {
    return;
  }

  try {
    urls.add(new URL(cleaned, baseUrl).toString());
  } catch {
    // Ignore malformed page fragments.
  }
}

function makeDocumentCandidate(candidate, status, httpStatus, contentType, contentLengthBytes) {
  return {
    url: candidate.url,
    document_type: candidate.document_type,
    discovered_from: candidate.discovered_from,
    source_context: candidate.source_context,
    status,
    http_status: httpStatus,
    content_type: contentType,
    content_length_bytes: contentLengthBytes,
    sha256: null,
    retrieved_at: null,
  };
}

function parseContentLength(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function cleanText(value) {
  return htmlDecode(String(value))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
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

function normalizeText(value) {
  return htmlDecode(String(value))
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

async function writeJson(path, value) {
  const absoluteOut = resolve(process.cwd(), path);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return absoluteOut;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const productProbePath = resolve(process.cwd(), args.productProbe);
  const productProbe = JSON.parse(await readFile(productProbePath, "utf8"));
  const targets = selectTargets(productProbe, args.limit);
  const profileProviders = new Set(targets.map((target) => target.provider));
  const pageByProvider = new Map();

  for (const provider of profileProviders) {
    const profile = CARRIER_PROFILES[provider];
    if (!profile) {
      continue;
    }
    pageByProvider.set(provider, await loadCarrierPage(profile, args));
  }

  const productResults = [];
  for (const target of targets) {
    const profile = CARRIER_PROFILES[target.provider];
    productResults.push(
      await probeProductDisclosure(target, pageByProvider.get(target.provider), profile, args),
    );
  }

  const carrierPages = [...pageByProvider.values()].map((page) => {
    const matchedProductCount = productResults.filter(
      (result) =>
        result.provider === page.provider &&
        result.best_match_score >= DISCLOSURE_MATCH_THRESHOLD &&
        result.result_status !== "no_profile",
    ).length;

    const serializablePage = { ...page };
    delete serializablePage.records;
    return {
      ...serializablePage,
      matched_product_count: matchedProductCount,
    };
  });

  const hashedDocumentCount = productResults.reduce(
    (sum, result) =>
      sum +
      result.document_candidates.filter((candidate) => candidate.status === "hashed").length,
    0,
  );

  const result = DisclosureProbeSchema.parse({
    metadata: {
      generated_at: DateTime.now().setZone("Asia/Seoul").toISO(),
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/collect-carrier-disclosures.mjs",
      input_product_probe: args.productProbe,
      output_version: "1.0",
      target_limit: args.limit,
      max_documents_per_product: args.maxDocumentsPerProduct,
    },
    targets,
    carrier_pages: carrierPages,
    product_results: productResults,
    qa: {
      service_db_ready: false,
      blockers: [
        "Disclosure crawling can prove source documents, but product coverage mapping still requires human review.",
        "Several carrier disclosure pages use JavaScript search forms, so HTML-only crawling may not expose all PDF URLs.",
        "A product is seed-ready only after official document hash, sale status, premium basis, coverage_category, and risk_targets are approved.",
      ],
      next_actions: [
        "Add carrier-specific JavaScript/API search adapters for Samsung Life, Hyundai Marine, KB Insurance, and Shinhan Life.",
        "Create a review CSV from latest_official_sources_snapshot, latest_product_document_probe, and latest_carrier_disclosure_probe.",
        "Promote only hash-backed and human-approved products into service seed candidates.",
      ],
    },
  });

  const absoluteOut = await writeJson(args.out, result);
  console.log(`Carrier disclosure probe written: ${absoluteOut}`);
  console.log(
    [
      `targets=${targets.length}`,
      `carrier_pages=${carrierPages.length}`,
      `accessible_pages=${carrierPages.filter((page) => page.page_status === "accessible").length}`,
      `hashed_documents=${hashedDocumentCount}`,
    ].join(" "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
