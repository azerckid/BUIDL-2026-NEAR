#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const TIMEZONE = "Asia/Seoul";
const DEFAULT_OUT_JSON = "data/insurance/latest_shinhan_standard_document_endpoint_probe.json";
const DEFAULT_OUT_CSV = "data/insurance/latest_shinhan_standard_document_endpoint_probe.csv";
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PAGE_SIZE = 500;
const DEFAULT_MAX_PAGES = 12;
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const ENDPOINT = "https://shinhanlife.co.kr/co/wcms/nodeInfoListPage.pwkjson";
const REFERER = "https://shinhanlife.co.kr/hp/cdhi0030.do";
const CATEGORY_ID = "M160991914330045272";
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; shinhan-standard-document-probe)";

const TARGET = {
  productSourceId: "src_shinhan_life_sol_cancer_standard_202605",
  productCode: "L11C009000007",
  rawProductName: "신한SOL암보험(무배당)(비갱신형)",
  normalizedProductName: "신한SOL암보험 비갱신형",
};

const SEARCH_QUERIES = [
  "신한SOL암보험",
  "신한SOL암보험(무배당)",
  "신한SOL암보험(무배당)(비갱신형)",
  "신한 SOL 암보험",
  "신한SOL 암보험",
  "SOL암보험",
  "신한SOL",
  "암보험",
];

const OutputSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.literal(TIMEZONE),
    generator: z.string(),
    output_version: z.string(),
    target_product_source_id: z.literal(TARGET.productSourceId),
    target_product_code: z.literal(TARGET.productCode),
    target_raw_product_name: z.literal(TARGET.rawProductName),
    db_write_performed: z.literal(false),
    seed_file_changed: z.literal(false),
  }),
  endpoint: z.object({
    method: z.literal("POST"),
    url: z.string().url(),
    referer: z.string().url(),
    category_id: z.string(),
    method_name: z.literal("selectListGoods"),
    screen_id: z.literal("cdhi0030"),
  }),
  summary: z.object({
    query_count: z.number().int(),
    active_rows_scanned: z.number().int(),
    historical_rows_scanned: z.number().int(),
    sol_or_cancer_rows: z.number().int(),
    standard_variant_hits: z.number().int(),
    no_refund_variant_hits: z.number().int(),
    downloaded_blocked_no_refund_documents: z.number().int(),
    decision_status: z.string(),
    recommended_source_review_status: z.literal("raw"),
    recommended_document_seed_action: z.literal("do_not_seed"),
  }),
  queries: z.array(
    z.object({
      label: z.string(),
      title: z.string(),
      meta06: z.string(),
      page_size: z.number().int(),
      pages_requested: z.number().int(),
      rows: z.number().int(),
      standard_variant_hits: z.number().int(),
      no_refund_variant_hits: z.number().int(),
      http_statuses: z.array(z.number().int()),
    }),
  ),
  candidate_records: z.array(
    z.object({
      title: z.string(),
      meta05: z.string(),
      meta06: z.string(),
      meta07: z.string(),
      meta08: z.string(),
      channel: z.string(),
      sale_status: z.string(),
      sale_start: z.string(),
      sale_end: z.string(),
      variant_decision: z.string(),
      standard_hit: z.boolean(),
      no_refund_hit: z.boolean(),
      text: z.string(),
      document_paths: z.object({
        summary: z.string().nullable(),
        business_method: z.string().nullable(),
        terms: z.string().nullable(),
      }),
    }),
  ),
  blocked_no_refund_documents: z.array(
    z.object({
      document_type: z.string(),
      url: z.string().url(),
      sha256: z.string().length(64),
      content_length_bytes: z.number().int(),
      variant_decision: z.literal("blocked_no_refund_document"),
    }),
  ),
  decision: z.object({
    result: z.string(),
    reason: z.string(),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    outJson: DEFAULT_OUT_JSON,
    outCsv: DEFAULT_OUT_CSV,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    pageSize: DEFAULT_PAGE_SIZE,
    maxPages: DEFAULT_MAX_PAGES,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--out-json") {
      args.outJson = argv[index + 1];
      index += 1;
    } else if (arg === "--out-csv") {
      args.outCsv = argv[index + 1];
      index += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--page-size") {
      args.pageSize = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--max-pages") {
      args.maxPages = Number(argv[index + 1]);
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
  if (!Number.isInteger(args.pageSize) || args.pageSize <= 0) {
    throw new Error("--page-size must be a positive integer");
  }
  if (!Number.isInteger(args.maxPages) || args.maxPages <= 0) {
    throw new Error("--max-pages must be a positive integer");
  }

  return args;
}

function printHelp() {
  console.log(`
Usage: node scripts/insurance/probe-shinhan-standard-documents.mjs [options]

Options:
  --out-json <path>     JSON output path (default: ${DEFAULT_OUT_JSON})
  --out-csv <path>      CSV output path (default: ${DEFAULT_OUT_CSV})
  --timeout-ms <ms>     Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})
  --page-size <n>       wcms page size for scan queries (default: ${DEFAULT_PAGE_SIZE})
  --max-pages <n>       max pages for blank-title scans (default: ${DEFAULT_MAX_PAGES})
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = DateTime.now().setZone(TIMEZONE).toISO();

  const querySpecs = [
    ...SEARCH_QUERIES.map((title) => ({
      label: `active keyword: ${title}`,
      title,
      meta06: "TRUE",
      pageSize: Math.min(args.pageSize, 500),
      maxPages: 1,
    })),
    ...SEARCH_QUERIES.map((title) => ({
      label: `historical keyword: ${title}`,
      title,
      meta06: "",
      pageSize: Math.min(args.pageSize, 500),
      maxPages: 2,
    })),
    {
      label: "active full catalog scan",
      title: "",
      meta06: "TRUE",
      pageSize: args.pageSize,
      maxPages: args.maxPages,
    },
    {
      label: "historical full catalog scan",
      title: "",
      meta06: "",
      pageSize: args.pageSize,
      maxPages: args.maxPages,
    },
  ];

  const queryResults = [];
  const allRecords = [];

  for (const spec of querySpecs) {
    const result = await runPagedQuery(spec, args);
    queryResults.push(result.summary);
    allRecords.push(...result.records);
  }

  const dedupedRecords = dedupeRecords(allRecords);
  const candidateRecords = dedupedRecords
    .filter((record) => isTargetShinhanSolCancer(record))
    .map(toCandidateRecord)
    .sort((a, b) => a.variant_decision.localeCompare(b.variant_decision) || a.title.localeCompare(b.title));
  const standardRecords = candidateRecords.filter((record) => record.standard_hit);
  const noRefundRecords = candidateRecords.filter((record) => record.no_refund_hit);
  const blockedDocuments = await downloadBlockedNoRefundDocuments(noRefundRecords[0], args);

  const output = {
    metadata: {
      generated_at: generatedAt,
      timezone: TIMEZONE,
      generator: "scripts/insurance/probe-shinhan-standard-documents.mjs",
      output_version: "2026-05-31.reprobe.v1",
      target_product_source_id: TARGET.productSourceId,
      target_product_code: TARGET.productCode,
      target_raw_product_name: TARGET.rawProductName,
      db_write_performed: false,
      seed_file_changed: false,
    },
    endpoint: {
      method: "POST",
      url: ENDPOINT,
      referer: REFERER,
      category_id: CATEGORY_ID,
      method_name: "selectListGoods",
      screen_id: "cdhi0030",
    },
    summary: {
      query_count: querySpecs.length,
      active_rows_scanned: countRowsByMeta(queryResults, "TRUE"),
      historical_rows_scanned: countRowsByMeta(queryResults, ""),
      sol_or_cancer_rows: candidateRecords.length,
      standard_variant_hits: standardRecords.length,
      no_refund_variant_hits: noRefundRecords.length,
      downloaded_blocked_no_refund_documents: blockedDocuments.length,
      decision_status: standardRecords.length > 0 ? "standard_endpoint_found" : "standard_endpoint_not_found",
      recommended_source_review_status: "raw",
      recommended_document_seed_action: "do_not_seed",
    },
    queries: queryResults,
    candidate_records: candidateRecords,
    blocked_no_refund_documents: blockedDocuments,
    decision: {
      result:
        standardRecords.length > 0
          ? "Review standard candidate documents before seeding."
          : `Keep ${TARGET.productSourceId} blocked.`,
      reason:
        standardRecords.length > 0
          ? "At least one Shinhan Life disclosure row does not contain the no-refund variant marker and must be manually checked."
          : "The official Shinhan Life disclosure endpoint still returns no standard/general document row for the Insurance Damoa standard source. The returned Shinhan SOL cancer row is the no-refund variant, so reusing its documents would mislink the source.",
      next_actions:
        standardRecords.length > 0
          ? [
              "Manually inspect the candidate standard documents before any seed change.",
              "Do not approve the source until summary, business method, and terms all match the standard/general variant.",
              "Keep DB write and seed changes in a separate PR.",
            ]
          : [
              "Do not reuse the no-refund documents for the standard source.",
              "Keep the source review_status raw until a standard official document endpoint is found.",
              "Proceed with matching keyword and caveat cleanup for other raw/needs_review sources whose official documents are clear.",
            ],
    },
  };

  const parsed = OutputSchema.parse(output);
  await writeJson(args.outJson, parsed);
  await writeCsv(args.outCsv, parsed);

  console.log(
    JSON.stringify(
      {
        outJson: args.outJson,
        outCsv: args.outCsv,
        decisionStatus: parsed.summary.decision_status,
        standardVariantHits: parsed.summary.standard_variant_hits,
        noRefundVariantHits: parsed.summary.no_refund_variant_hits,
        activeRowsScanned: parsed.summary.active_rows_scanned,
        historicalRowsScanned: parsed.summary.historical_rows_scanned,
      },
      null,
      2,
    ),
  );
}

async function runPagedQuery(spec, args) {
  const records = [];
  const httpStatuses = [];

  for (let pageIndex = 1; pageIndex <= spec.maxPages; pageIndex += 1) {
    const { status, rows } = await fetchShinhanRows({
      title: spec.title,
      meta06: spec.meta06,
      pageSize: spec.pageSize,
      pageIndex,
      timeoutMs: args.timeoutMs,
    });
    httpStatuses.push(status);
    records.push(...rows);
    if (rows.length < spec.pageSize) {
      break;
    }
  }

  const candidates = records.filter((record) => isRelevantRecord(record));

  return {
    records,
    summary: {
      label: spec.label,
      title: spec.title,
      meta06: spec.meta06,
      page_size: spec.pageSize,
      pages_requested: httpStatuses.length,
      rows: records.length,
      standard_variant_hits: candidates.filter((record) => isStandardVariant(record)).length,
      no_refund_variant_hits: candidates.filter((record) => isNoRefundVariant(record)).length,
      http_statuses: httpStatuses,
    },
  };
}

async function fetchShinhanRows({ title, meta06, pageSize, pageIndex, timeoutMs }) {
  const response = await fetchWithTimeout(ENDPOINT, {
    timeoutMs,
    method: "POST",
    accept: "application/json,text/javascript,*/*;q=0.01",
    contentType: "application/json; charset=UTF-8",
    headers: {
      Origin: "https://shinhanlife.co.kr",
      Referer: REFERER,
      "X-AJAX-CALL": "true",
      "Proworks-Body": "Y",
      "Proworks-Lang": "ko",
    },
    body: JSON.stringify({
      elData: {
        catId: CATEGORY_ID,
        pageSize,
        pageIndex,
        method: "selectListGoods",
        title,
        meta06,
        scrnId: "cdhi0030",
      },
      userHeader: {
        scrnId: "cdhi0030",
        appliDtptDutjCd: "DH",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Shinhan wcms HTTP ${response.status} for title=${title || "(blank)"}`);
  }

  const payload = await response.json();
  return {
    status: response.status,
    rows: payload?.elData?.nodeInfoVoList ?? [],
  };
}

function dedupeRecords(records) {
  const seen = new Map();
  for (const record of records) {
    const key = [
      record.id,
      record.title,
      record.meta05,
      record.meta09,
      record.meta10,
      record.meta11,
    ]
      .filter(Boolean)
      .join("|");
    if (!seen.has(key)) {
      seen.set(key, record);
    }
  }
  return [...seen.values()];
}

function isRelevantRecord(record) {
  const normalized = normalizeKorean(makeSearchText(record));
  return normalized.includes("신한sol암보험") || normalized.includes("암보험");
}

function isNoRefundVariant(record) {
  const normalized = normalizeKorean(makeSearchText(record));
  return (
    isTargetShinhanSolCancer(record) &&
    (normalized.includes("해약환급금미지급형") ||
      normalized.includes("해지환급금미지급형") ||
      normalized.includes("무해지환급형"))
  );
}

function isStandardVariant(record) {
  return isTargetShinhanSolCancer(record) && !isNoRefundVariant(record);
}

function isTargetShinhanSolCancer(record) {
  return normalizeKorean(makeSearchText(record)).includes("신한sol암보험");
}

function toCandidateRecord(record) {
  const text = cleanText(
    [
      record.meta01,
      record.meta02,
      record.meta03,
      record.meta05,
      record.title,
      record.meta07,
      record.meta08,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const standardHit = isStandardVariant(record);
  const noRefundHit = isNoRefundVariant(record);

  return {
    title: String(record.title ?? ""),
    meta05: String(record.meta05 ?? ""),
    meta06: String(record.meta06 ?? ""),
    meta07: String(record.meta07 ?? ""),
    meta08: String(record.meta08 ?? ""),
    channel: String(record.meta02 ?? ""),
    sale_status: String(record.meta06 ?? ""),
    sale_start: String(record.meta07 ?? ""),
    sale_end: String(record.meta08 ?? ""),
    variant_decision: standardHit
      ? "candidate_standard_variant_requires_manual_review"
      : noRefundHit
        ? "blocked_no_refund_variant"
        : "non_target_related_row",
    standard_hit: standardHit,
    no_refund_hit: noRefundHit,
    text,
    document_paths: {
      summary: record.meta09 ? String(record.meta09) : null,
      business_method: record.meta10 ? String(record.meta10) : null,
      terms: record.meta11 ? String(record.meta11) : null,
    },
  };
}

async function downloadBlockedNoRefundDocuments(candidate, args) {
  if (!candidate) {
    return [];
  }

  const documents = [
    ["summary", candidate.document_paths.summary],
    ["business_method", candidate.document_paths.business_method],
    ["terms", candidate.document_paths.terms],
  ].filter(([, path]) => Boolean(path));

  const rows = [];
  for (const [documentType, path] of documents) {
    const url = toShinhanPublicFileUrl(path);
    const response = await fetchWithTimeout(url, {
      timeoutMs: args.timeoutMs,
      accept: "application/pdf,*/*",
    });
    if (!response.ok) {
      throw new Error(`Shinhan document HTTP ${response.status}: ${url}`);
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > DEFAULT_MAX_PDF_BYTES) {
      throw new Error(`PDF is too large: ${contentLength} bytes`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > DEFAULT_MAX_PDF_BYTES) {
      throw new Error(`PDF is too large: ${buffer.byteLength} bytes`);
    }
    rows.push({
      document_type: documentType,
      url,
      sha256: createHash("sha256").update(buffer).digest("hex"),
      content_length_bytes: buffer.byteLength,
      variant_decision: "blocked_no_refund_document",
    });
  }

  return rows;
}

function countRowsByMeta(queryResults, meta06) {
  return queryResults
    .filter((query) => query.meta06 === meta06)
    .reduce((sum, query) => sum + query.rows, 0);
}

function toShinhanPublicFileUrl(path) {
  const value = String(path);
  const publicPath = value.replace(/^\/repo\/[^/]+/, "/bizxpress");
  return new URL(publicPath, "https://shinhanlife.co.kr").toString();
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: options.accept ?? "*/*",
        "Content-Type": options.contentType,
        "User-Agent": USER_AGENT,
        ...options.headers,
      },
      body: options.body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function makeSearchText(record) {
  return cleanText(
    [
      record.meta01,
      record.meta02,
      record.meta03,
      record.meta05,
      record.title,
      record.meta07,
      record.meta08,
    ]
      .filter(Boolean)
      .join(" "),
  ).toLowerCase();
}

function normalizeKorean(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()（）,\-_]/g, "");
}

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

async function writeJson(filePath, value) {
  const absolute = resolve(filePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCsv(filePath, output) {
  const rows = [
    [
      "generated_at",
      "decision_status",
      "title",
      "meta05",
      "sale_status",
      "sale_start",
      "sale_end",
      "variant_decision",
      "standard_hit",
      "no_refund_hit",
    ],
    ...output.candidate_records.map((record) => [
      output.metadata.generated_at,
      output.summary.decision_status,
      record.title,
      record.meta05,
      record.sale_status,
      record.sale_start,
      record.sale_end,
      record.variant_decision,
      String(record.standard_hit),
      String(record.no_refund_hit),
    ]),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const absolute = resolve(filePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${csv}\n`, "utf8");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
