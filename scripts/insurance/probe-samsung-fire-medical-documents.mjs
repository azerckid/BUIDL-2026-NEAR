#!/usr/bin/env node

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { DateTime } from "luxon";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const DEFAULT_JSON_OUT = "data/insurance/latest_samsung_fire_medical_document_reprobe.json";
const DEFAULT_CSV_OUT = "data/insurance/latest_samsung_fire_medical_document_reprobe.csv";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; samsung-fire-medical-document-reprobe)";

const TARGET = {
  provider: "삼성화재",
  carrier_id: "carrier_samsung_fire",
  product_source_id: "src_samsung_fire_direct_medical_202605",
  e_insmarket_product_code: "N08G004000002G",
  raw_product_name: "무배당 삼성화재 다이렉트 실손의료비보험(2605.1)",
  official_product_url:
    "http://direct.samsungfire.com/CR_MyAnycarWeb/overture_index.jsp?OTK=Q1510OB0001",
  direct_product_page_url: "https://direct.samsungfire.com/mall/PP030404_001.html?pcMode=true",
  mobile_product_page_url: "https://direct.samsungfire.com/m/mall/realloss.html",
  public_product_page_url: "https://www.samsungfire.com/product/P_P02_12_03_000.html",
  terms_pdf_url: "https://direct.samsungfire.com/docs/realloss.pdf",
};

const ResultSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    output_version: z.string(),
    db_write_performed: z.boolean(),
    seed_file_changed: z.boolean(),
  }),
  target: z.object({
    provider: z.string(),
    carrier_id: z.string(),
    product_source_id: z.string(),
    e_insmarket_product_code: z.string(),
    raw_product_name: z.string(),
    official_product_url: z.string().url(),
  }),
  page_probes: z.array(
    z.object({
      label: z.string(),
      url: z.string().url(),
      page_status: z.string(),
      http_status: z.number().int().nullable(),
      final_url: z.string().nullable(),
      content_type: z.string().nullable(),
      pdf_links: z.array(z.string().url()),
      evidence: z.object({
        product_name_mentioned: z.boolean(),
        product_version_mentioned: z.boolean(),
        terms_label_mentioned: z.boolean(),
        rate_revision_2026_05_mentioned: z.boolean(),
        fifth_generation_mentioned: z.boolean(),
        snippets: z.array(z.string()),
      }),
      error: z.string().optional(),
    }),
  ),
  document_candidate: z.object({
    url: z.string().url(),
    document_type: z.literal("terms"),
    status: z.string(),
    http_status: z.number().int().nullable(),
    content_type: z.string().nullable(),
    content_length_bytes: z.number().int().nullable(),
    sha256: z.string().nullable(),
    retrieved_at: z.string().nullable(),
    linked_from_product_page: z.boolean(),
    linked_from_pages: z.array(z.string()),
    evidence_summary: z.array(z.string()),
    pdf_text_evidence: z
      .object({
        extractor_status: z.string(),
        product_title_mentioned: z.boolean(),
        product_version_mentioned: z.boolean(),
        general_form_mentioned: z.boolean(),
        contract_conversion_form_mentioned: z.boolean(),
        snippets: z.array(z.string()),
        error: z.string().optional(),
      })
      .nullable(),
    error: z.string().optional(),
  }),
  decision: z.object({
    product_specific_endpoint_found: z.boolean(),
    blocker_resolved: z.boolean(),
    recommended_matching_review_status: z.string(),
    snapshot_readiness: z.string(),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    jsonOut: DEFAULT_JSON_OUT,
    csvOut: DEFAULT_CSV_OUT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxPdfBytes: DEFAULT_MAX_PDF_BYTES,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json-out") {
      args.jsonOut = argv[i + 1];
      i += 1;
    } else if (arg === "--csv-out") {
      args.csvOut = argv[i + 1];
      i += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[i + 1]);
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

  for (const key of ["timeoutMs", "maxPdfBytes"]) {
    if (!Number.isInteger(args[key]) || args[key] <= 0) {
      throw new Error(`--${toKebabCase(key)} must be a positive integer`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/probe-samsung-fire-medical-documents.mjs [--json-out path] [--csv-out path]

Default outputs:
  ${DEFAULT_JSON_OUT}
  ${DEFAULT_CSV_OUT}
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
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: options.accept ?? "*/*",
        ...(options.referer ? { Referer: options.referer } : {}),
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function probePage(label, url, options) {
  const base = {
    label,
    url,
    page_status: "failed",
    http_status: null,
    final_url: null,
    content_type: null,
    pdf_links: [],
    evidence: {
      product_name_mentioned: false,
      product_version_mentioned: false,
      terms_label_mentioned: false,
      rate_revision_2026_05_mentioned: false,
      fifth_generation_mentioned: false,
      snippets: [],
    },
  };

  try {
    const response = await fetchWithTimeout(url, {
      timeoutMs: options.timeoutMs,
      accept: "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
    });
    const contentType = response.headers.get("content-type");
    const html = await response.text();
    const text = cleanText(html);

    return {
      ...base,
      page_status: response.ok ? "accessible" : "http_error",
      http_status: response.status,
      final_url: response.url,
      content_type: contentType,
      pdf_links: extractPdfUrls(html, response.url),
      evidence: buildPageEvidence(text),
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildPageEvidence(text) {
  const normalized = normalizeText(text);
  const evidenceTerms = [
    "무배당 삼성화재 다이렉트 실손의료비보험",
    "2605.1",
    "상품약관",
    "2026년 5월 요율",
    "2026년 5월 5세대 실손의료비보험",
  ];

  return {
    product_name_mentioned: normalized.includes("무배당 삼성화재 다이렉트 실손의료비보험"),
    product_version_mentioned: normalized.includes("2605.1"),
    terms_label_mentioned: normalized.includes("상품약관"),
    rate_revision_2026_05_mentioned: normalized.includes("2026년 5월 요율"),
    fifth_generation_mentioned: normalized.includes("2026년 5월 5세대 실손의료비보험"),
    snippets: evidenceTerms.map((term) => findSnippet(text, term)).filter(Boolean),
  };
}

function findSnippet(text, term) {
  const index = text.indexOf(term);
  if (index < 0) {
    return null;
  }
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + term.length + 120);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
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

async function probeTermsPdf(pageProbes, options) {
  const linkedFromPages = pageProbes
    .filter((page) => page.pdf_links.includes(TARGET.terms_pdf_url))
    .map((page) => page.label);

  const base = {
    url: TARGET.terms_pdf_url,
    document_type: "terms",
    status: "failed",
    http_status: null,
    content_type: null,
    content_length_bytes: null,
    sha256: null,
    retrieved_at: null,
    linked_from_product_page: linkedFromPages.includes("direct_product_page"),
    linked_from_pages: linkedFromPages,
    evidence_summary: makeEvidenceSummary(pageProbes, linkedFromPages),
    pdf_text_evidence: null,
  };

  try {
    const response = await fetchWithTimeout(TARGET.terms_pdf_url, {
      timeoutMs: options.timeoutMs,
      accept: "application/pdf,*/*",
      referer: TARGET.direct_product_page_url,
    });
    const contentType = response.headers.get("content-type");
    const contentLength = parseContentLength(response.headers.get("content-length"));

    if (!response.ok) {
      return {
        ...base,
        status: "http_error",
        http_status: response.status,
        content_type: contentType,
        content_length_bytes: contentLength,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > options.maxPdfBytes) {
      return {
        ...base,
        status: "skipped_large_pdf",
        http_status: response.status,
        content_type: contentType,
        content_length_bytes: buffer.length,
      };
    }

    const looksLikePdf = buffer.subarray(0, 4).toString("utf8") === "%PDF";
    if (!looksLikePdf && !String(contentType ?? "").toLowerCase().includes("application/pdf")) {
      return {
        ...base,
        status: "non_pdf_response",
        http_status: response.status,
        content_type: contentType,
        content_length_bytes: buffer.length,
      };
    }

    const pdfTextEvidence = await extractPdfTextEvidence(buffer);
    const evidenceSummary = [...base.evidence_summary];
    if (pdfTextEvidence.product_title_mentioned) {
      evidenceSummary.push("약관 PDF 텍스트가 삼성화재 다이렉트 실손의료비보험 상품명을 명시한다.");
    }
    if (pdfTextEvidence.product_version_mentioned) {
      evidenceSummary.push("약관 PDF 텍스트가 2605.1 버전을 명시한다.");
    }
    if (pdfTextEvidence.general_form_mentioned) {
      evidenceSummary.push("약관 PDF 텍스트가 일반형 적용 조항을 포함한다.");
    }

    return {
      ...base,
      status: "hashed",
      http_status: response.status,
      content_type: contentType,
      content_length_bytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      retrieved_at: DateTime.now().setZone("Asia/Seoul").toISO(),
      evidence_summary: evidenceSummary,
      pdf_text_evidence: pdfTextEvidence,
    };
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function extractPdfTextEvidence(buffer) {
  let tempDir = null;

  try {
    tempDir = await mkdtemp(join(tmpdir(), "samsung-fire-medical-"));
    const pdfPath = join(tempDir, "realloss.pdf");
    const textPath = join(tempDir, "realloss.txt");
    await writeFile(pdfPath, buffer);
    await execFileAsync("pdftotext", ["-f", "1", "-l", "12", pdfPath, textPath], {
      timeout: 15_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const text = await readFile(textPath, "utf8");
    return buildPdfTextEvidence(text);
  } catch (error) {
    return {
      extractor_status: "failed",
      product_title_mentioned: false,
      product_version_mentioned: false,
      general_form_mentioned: false,
      contract_conversion_form_mentioned: false,
      snippets: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
}

function buildPdfTextEvidence(text) {
  const normalized = normalizeText(text);
  const compact = normalized.replace(/\s+/g, "");
  const titleTerm = "삼성화재 다이렉트 실손의료비보험";
  const versionTerm = "2605.1";
  const generalTerm = "일반형";
  const conversionTerm = "계약전환용";

  return {
    extractor_status: "parsed",
    product_title_mentioned: compact.includes(titleTerm.replace(/\s+/g, "")),
    product_version_mentioned: compact.includes(versionTerm),
    general_form_mentioned: compact.includes(generalTerm),
    contract_conversion_form_mentioned: compact.includes(conversionTerm),
    snippets: [titleTerm, versionTerm, generalTerm, conversionTerm]
      .map((term) => findSnippet(normalized, term))
      .filter(Boolean),
  };
}

function makeEvidenceSummary(pageProbes, linkedFromPages) {
  const directPage = pageProbes.find((page) => page.label === "direct_product_page");
  const summary = [];

  if (directPage?.evidence.product_name_mentioned) {
    summary.push("직접 상품 상세 페이지가 상품명을 명시한다.");
  }
  if (directPage?.evidence.product_version_mentioned) {
    summary.push("직접 상품 상세 페이지가 2605.1 버전을 명시한다.");
  }
  if (directPage?.evidence.terms_label_mentioned) {
    summary.push("직접 상품 상세 페이지가 상품약관 항목을 노출한다.");
  }
  if (linkedFromPages.includes("direct_product_page")) {
    summary.push("직접 상품 상세 페이지에서 realloss.pdf 약관 링크가 발견됐다.");
  }
  if (directPage?.evidence.rate_revision_2026_05_mentioned) {
    summary.push("직접 상품 상세 페이지가 2026년 5월 요율 개정을 명시한다.");
  }
  if (directPage?.evidence.fifth_generation_mentioned) {
    summary.push("직접 상품 상세 페이지가 2026년 5월 5세대 실손의료비보험 출시를 명시한다.");
  }

  return summary;
}

function buildDecision(documentCandidate) {
  const hasProductSpecificEndpoint =
    documentCandidate.status === "hashed" &&
    documentCandidate.linked_from_product_page &&
    documentCandidate.evidence_summary.length >= 4;

  return {
    product_specific_endpoint_found: hasProductSpecificEndpoint,
    blocker_resolved: hasProductSpecificEndpoint,
    recommended_matching_review_status: hasProductSpecificEndpoint
      ? "baseline_ready_snapshot_candidate"
      : "baseline_blocked_document_specificity",
    snapshot_readiness: hasProductSpecificEndpoint
      ? "ready_for_seed_pr_after_source_document_update"
      : "blocked_until_product_specific_document_confirmed",
    next_actions: hasProductSpecificEndpoint
      ? [
          "seed.ts에서 삼성화재 source를 approved로 승격하고 baseline insurance_products snapshot row를 추가한다.",
          "삼성화재 quote 4건을 approved로 승격한다.",
          "운영 DB 백업 후 seed apply PR로 source-backed active 추천 상품을 8건에서 9건으로 확대한다.",
        ]
      : [
          "삼성화재 공식 상품별 약관 endpoint를 추가 탐색한다.",
          "상품 상세 페이지와 PDF link가 같은 상품을 가리키는지 수동 검수한다.",
        ],
  };
}

function cleanText(html) {
  return htmlDecode(String(html))
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return cleanText(value).replace(/\s+/g, " ").trim();
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

function parseContentLength(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

async function writeJson(path, value) {
  const absoluteOut = resolve(process.cwd(), path);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return absoluteOut;
}

async function writeCsv(path, result) {
  const absoluteOut = resolve(process.cwd(), path);
  await mkdir(dirname(absoluteOut), { recursive: true });
  const row = {
    generated_at: result.metadata.generated_at,
    provider: result.target.provider,
    product_source_id: result.target.product_source_id,
    product_code: result.target.e_insmarket_product_code,
    raw_product_name: result.target.raw_product_name,
    document_url: result.document_candidate.url,
    document_status: result.document_candidate.status,
    sha256: result.document_candidate.sha256 ?? "",
    linked_from_product_page: String(result.document_candidate.linked_from_product_page),
    evidence_count: String(result.document_candidate.evidence_summary.length),
    blocker_resolved: String(result.decision.blocker_resolved),
    snapshot_readiness: result.decision.snapshot_readiness,
  };
  const headers = Object.keys(row);
  const csv = [
    headers.join(","),
    headers.map((header) => csvEscape(row[header])).join(","),
  ].join("\n");
  await writeFile(absoluteOut, `${csv}\n`, "utf8");
  return absoluteOut;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pageTargets = [
    ["e_insmarket_redirect", TARGET.official_product_url],
    ["direct_product_page", TARGET.direct_product_page_url],
    ["mobile_product_page", TARGET.mobile_product_page_url],
    ["public_product_page", TARGET.public_product_page_url],
  ];
  const pageProbes = [];

  for (const [label, url] of pageTargets) {
    pageProbes.push(await probePage(label, url, args));
  }

  const documentCandidate = await probeTermsPdf(pageProbes, args);
  const result = ResultSchema.parse({
    metadata: {
      generated_at: DateTime.now().setZone("Asia/Seoul").toISO(),
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/probe-samsung-fire-medical-documents.mjs",
      output_version: "1.0",
      db_write_performed: false,
      seed_file_changed: false,
    },
    target: {
      provider: TARGET.provider,
      carrier_id: TARGET.carrier_id,
      product_source_id: TARGET.product_source_id,
      e_insmarket_product_code: TARGET.e_insmarket_product_code,
      raw_product_name: TARGET.raw_product_name,
      official_product_url: TARGET.official_product_url,
    },
    page_probes: pageProbes,
    document_candidate: documentCandidate,
    decision: buildDecision(documentCandidate),
  });

  const jsonPath = await writeJson(args.jsonOut, result);
  const csvPath = await writeCsv(args.csvOut, result);

  console.log(`Samsung Fire medical document reprobe JSON written: ${jsonPath}`);
  console.log(`Samsung Fire medical document reprobe CSV written: ${csvPath}`);
  console.log(
    [
      `document_status=${result.document_candidate.status}`,
      `linked_from_product_page=${result.document_candidate.linked_from_product_page}`,
      `blocker_resolved=${result.decision.blocker_resolved}`,
    ].join(" "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
