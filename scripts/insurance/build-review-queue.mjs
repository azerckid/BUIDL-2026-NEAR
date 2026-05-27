#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_SNAPSHOT = "data/insurance/latest_official_sources_snapshot.json";
const DEFAULT_PRODUCT_PROBE = "data/insurance/latest_product_document_probe.json";
const DEFAULT_DISCLOSURE_PROBE = "data/insurance/latest_carrier_disclosure_probe.json";
const DEFAULT_OUT = "data/insurance/latest_insurance_review_queue.csv";
const DEFAULT_SUMMARY_OUT = "data/insurance/latest_insurance_review_queue_summary.json";

const ReviewRowSchema = z.object({
  generated_at: z.string(),
  provider: z.string(),
  product_group: z.string(),
  raw_product_name: z.string(),
  premium_text: z.string(),
  e_insmarket_product_code: z.string(),
  e_insmarket_source_url: z.string(),
  official_product_url: z.string(),
  product_page_status: z.string(),
  product_page_hashed_documents: z.number().int(),
  carrier_result_status: z.string(),
  carrier_best_match_score: z.number(),
  carrier_hashed_documents: z.number().int(),
  hashed_document_types: z.string(),
  hashed_document_sha256: z.string(),
  hashed_document_urls: z.string(),
  review_status: z.string(),
  blockers: z.string(),
  next_action: z.string(),
});

const ReviewSummarySchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    output_version: z.string(),
    input_snapshot: z.string(),
    input_product_probe: z.string(),
    input_disclosure_probe: z.string(),
    output_csv: z.string(),
  }),
  counts: z.object({
    review_rows: z.number().int(),
    rows_with_official_product_url: z.number().int(),
    rows_with_hashed_documents: z.number().int(),
    hashed_documents: z.number().int(),
    needs_human_review: z.number().int(),
    needs_source_document: z.number().int(),
    needs_official_product_url: z.number().int(),
  }),
  qa: z.object({
    service_db_ready: z.boolean(),
    blockers: z.array(z.string()),
    next_actions: z.array(z.string()),
  }),
});

function parseArgs(argv) {
  const args = {
    snapshot: DEFAULT_SNAPSHOT,
    productProbe: DEFAULT_PRODUCT_PROBE,
    disclosureProbe: DEFAULT_DISCLOSURE_PROBE,
    out: DEFAULT_OUT,
    summaryOut: DEFAULT_SUMMARY_OUT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--snapshot") {
      args.snapshot = argv[i + 1];
      i += 1;
    } else if (arg === "--product-probe") {
      args.productProbe = argv[i + 1];
      i += 1;
    } else if (arg === "--disclosure-probe") {
      args.disclosureProbe = argv[i + 1];
      i += 1;
    } else if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "--summary-out") {
      args.summaryOut = argv[i + 1];
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/build-review-queue.mjs [--snapshot path] [--product-probe path] [--disclosure-probe path] [--out path]

Default output:
  ${DEFAULT_OUT}
  ${DEFAULT_SUMMARY_OUT}
`);
}

function flattenProducts(snapshot) {
  return Object.values(snapshot.product_samples ?? {}).flatMap((sample) =>
    (sample.products ?? []).map((product) => ({
      provider: product.provider,
      product_group: product.product_group,
      raw_product_name: product.raw_product_name,
      premium_text: product.premium_text,
      e_insmarket_product_code: product.e_insmarket_product_code ?? "",
      e_insmarket_source_url: product.source_url ?? "",
      official_product_url: product.official_product_url ?? "",
    })),
  );
}

function buildProbeIndex(items, documentKey) {
  const index = new Map();
  for (const item of items ?? []) {
    index.set(makeProductKey(item), {
      ...item,
      hashed_documents: (item[documentKey] ?? []).filter(
        (document) => document.status === "hashed",
      ).map((document) => ({
        ...document,
        document_type: document.document_type ?? inferDocumentType(document.url),
      })),
    });
  }
  return index;
}

function inferDocumentType(url) {
  const decodedUrl = decodeURIComponent(String(url));
  if (decodedUrl.includes("요약서")) {
    return "summary";
  }
  if (decodedUrl.includes("약관")) {
    return "terms";
  }
  if (decodedUrl.includes("사방") || decodedUrl.includes("사업")) {
    return "business_method";
  }
  if (decodedUrl.includes("설명서")) {
    return "product_explanation";
  }
  return "pdf";
}

function makeProductKey(product) {
  if (product.e_insmarket_product_code) {
    return `${product.provider}|${product.e_insmarket_product_code}`;
  }
  return `${product.provider}|${normalizeProductName(product.raw_product_name)}`;
}

function normalizeProductName(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildReviewRow(product, productProbe, disclosureProbe, generatedAt) {
  const productPageDocuments = productProbe?.hashed_documents ?? [];
  const carrierDocuments = disclosureProbe?.hashed_documents ?? [];
  const hashedDocuments = [...productPageDocuments, ...carrierDocuments];
  const reviewStatus = determineReviewStatus(product, hashedDocuments);
  const blockers = determineBlockers(product, hashedDocuments);

  return ReviewRowSchema.parse({
    generated_at: generatedAt,
    provider: product.provider,
    product_group: product.product_group,
    raw_product_name: product.raw_product_name,
    premium_text: product.premium_text,
    e_insmarket_product_code: product.e_insmarket_product_code,
    e_insmarket_source_url: product.e_insmarket_source_url,
    official_product_url: product.official_product_url,
    product_page_status: productProbe?.page_status ?? "not_probed",
    product_page_hashed_documents: productPageDocuments.length,
    carrier_result_status: disclosureProbe?.result_status ?? "not_probed",
    carrier_best_match_score: disclosureProbe?.best_match_score ?? 0,
    carrier_hashed_documents: carrierDocuments.length,
    hashed_document_types: hashedDocuments.map((document) => document.document_type).join("|"),
    hashed_document_sha256: hashedDocuments.map((document) => document.sha256).join("|"),
    hashed_document_urls: hashedDocuments.map((document) => document.url).join("|"),
    review_status: reviewStatus,
    blockers: blockers.join("|"),
    next_action: determineNextAction(reviewStatus),
  });
}

function determineReviewStatus(product, hashedDocuments) {
  if (hashedDocuments.length > 0) {
    return "needs_human_review";
  }
  if (product.official_product_url) {
    return "needs_source_document";
  }
  return "needs_official_product_url";
}

function determineBlockers(product, hashedDocuments) {
  const blockers = [];
  if (!product.official_product_url) {
    blockers.push("official_product_url_missing");
  }
  if (hashedDocuments.length === 0) {
    blockers.push("official_document_hash_missing");
  }
  blockers.push("sale_status_unapproved");
  blockers.push("premium_basis_unapproved");
  blockers.push("coverage_category_unapproved");
  blockers.push("risk_targets_unapproved");
  return blockers;
}

function determineNextAction(reviewStatus) {
  if (reviewStatus === "needs_human_review") {
    return "Verify product identity, sale status, premium basis, coverage_category, and risk_targets.";
  }
  if (reviewStatus === "needs_source_document") {
    return "Find official terms or summary PDF from carrier disclosure page, JavaScript API, or manual review.";
  }
  return "Recover official product URL from source page or manual review.";
}

function rowsToCsv(rows) {
  const headers = Object.keys(ReviewRowSchema.shape);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(process.cwd(), path), "utf8"));
}

async function writeText(path, value) {
  const absoluteOut = resolve(process.cwd(), path);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, value, "utf8");
  return absoluteOut;
}

async function writeJson(path, value) {
  return await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = DateTime.now().setZone("Asia/Seoul").toISO();
  const snapshot = await readJson(args.snapshot);
  const productProbe = await readJson(args.productProbe);
  const disclosureProbe = await readJson(args.disclosureProbe);
  const products = flattenProducts(snapshot);
  const productProbeIndex = buildProbeIndex(productProbe.probes, "pdf_candidates");
  const disclosureProbeIndex = buildProbeIndex(
    disclosureProbe.product_results,
    "document_candidates",
  );

  const rows = products.map((product) =>
    buildReviewRow(
      product,
      productProbeIndex.get(makeProductKey(product)),
      disclosureProbeIndex.get(makeProductKey(product)),
      generatedAt,
    ),
  );
  const csv = `${rowsToCsv(rows)}\n`;
  const absoluteCsvOut = await writeText(args.out, csv);

  const hashedDocumentCount = rows.reduce(
    (sum, row) =>
      sum +
      (row.hashed_document_sha256 ? row.hashed_document_sha256.split("|").filter(Boolean).length : 0),
    0,
  );
  const summary = ReviewSummarySchema.parse({
    metadata: {
      generated_at: generatedAt,
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/build-review-queue.mjs",
      output_version: "1.0",
      input_snapshot: args.snapshot,
      input_product_probe: args.productProbe,
      input_disclosure_probe: args.disclosureProbe,
      output_csv: args.out,
    },
    counts: {
      review_rows: rows.length,
      rows_with_official_product_url: rows.filter((row) => row.official_product_url).length,
      rows_with_hashed_documents: rows.filter((row) => row.hashed_document_sha256).length,
      hashed_documents: hashedDocumentCount,
      needs_human_review: rows.filter((row) => row.review_status === "needs_human_review").length,
      needs_source_document: rows.filter((row) => row.review_status === "needs_source_document")
        .length,
      needs_official_product_url: rows.filter(
        (row) => row.review_status === "needs_official_product_url",
      ).length,
    },
    qa: {
      service_db_ready: false,
      blockers: [
        "The CSV is a human review queue, not an approved service seed.",
        "coverage_category and risk_targets must be approved before recommendation use.",
        "Premium basis and sale status must be verified against official documents.",
      ],
      next_actions: [
        "Review hash-backed rows first.",
        "Add carrier-specific JS/API adapters for rows that still need source documents.",
        "Promote approved rows into insurance_product_sources or seed candidates.",
      ],
    },
  });
  const absoluteSummaryOut = await writeJson(args.summaryOut, summary);

  console.log(`Review queue CSV written: ${absoluteCsvOut}`);
  console.log(`Review queue summary written: ${absoluteSummaryOut}`);
  console.log(
    [
      `rows=${summary.counts.review_rows}`,
      `official_urls=${summary.counts.rows_with_official_product_url}`,
      `hash_backed_rows=${summary.counts.rows_with_hashed_documents}`,
      `hashed_documents=${summary.counts.hashed_documents}`,
    ].join(" "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
