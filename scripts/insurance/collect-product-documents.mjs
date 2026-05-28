#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_SNAPSHOT = "data/insurance/latest_official_sources_snapshot.json";
const DEFAULT_OUT = "data/insurance/latest_product_document_probe.json";
const DEFAULT_LIMIT = 8;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_PDF_BYTES = 25 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyDNAInsuranceAgent/0.1; product-document-probe)";

const TARGET_PROVIDERS = [
  "삼성생명",
  "삼성화재",
  "DB생명",
  "DB손보",
  "한화생명",
  "현대해상",
  "KB손보",
  "신한라이프생명",
];

const ProbeResultSchema = z.object({
  metadata: z.object({
    generated_at: z.string(),
    timezone: z.string(),
    generator: z.string(),
    input_snapshot: z.string(),
    output_version: z.string(),
    target_limit: z.number().int(),
    target_product_codes: z.array(z.string()),
  }),
  selected_products: z.array(
    z.object({
      provider: z.string(),
      product_group: z.string(),
      raw_product_name: z.string(),
      premium_text: z.string(),
      e_insmarket_product_code: z.string().nullable(),
      official_product_url: z.string().url(),
    }),
  ),
  probes: z.array(
    z.object({
      provider: z.string(),
      product_group: z.string(),
      raw_product_name: z.string(),
      premium_text: z.string(),
      e_insmarket_product_code: z.string().nullable(),
      official_product_url: z.string().url(),
      page_status: z.string(),
      http_status: z.number().int().nullable(),
      final_url: z.string().nullable(),
      content_type: z.string().nullable(),
      pdf_candidates: z.array(
        z.object({
          url: z.string().url(),
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
      error: z.string().optional(),
    }),
  ),
  skipped_products: z.array(
    z.object({
      provider: z.string().nullable(),
      product_group: z.string().nullable(),
      raw_product_name: z.string().nullable(),
      premium_text: z.string().nullable(),
      e_insmarket_product_code: z.string(),
      official_product_url: z.string().nullable(),
      reason: z.string(),
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
    snapshot: DEFAULT_SNAPSHOT,
    out: DEFAULT_OUT,
    limit: DEFAULT_LIMIT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxPdfBytes: DEFAULT_MAX_PDF_BYTES,
    productCodes: [],
    limitWasSet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--snapshot") {
      args.snapshot = argv[i + 1];
      i += 1;
    } else if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "--limit") {
      args.limit = Number(argv[i + 1]);
      args.limitWasSet = true;
      i += 1;
    } else if (arg === "--timeout-ms") {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--max-pdf-bytes") {
      args.maxPdfBytes = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--product-codes") {
      args.productCodes = String(argv[i + 1] ?? "")
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error("--timeout-ms must be a positive integer");
  }
  if (!Number.isInteger(args.maxPdfBytes) || args.maxPdfBytes <= 0) {
    throw new Error("--max-pdf-bytes must be a positive integer");
  }
  if (args.productCodes.length > 0 && !args.limitWasSet) {
    args.limit = args.productCodes.length;
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/collect-product-documents.mjs [--snapshot path] [--out path] [--limit 8]
  node scripts/insurance/collect-product-documents.mjs --product-codes L43C009000022,N71G004000001G

Default input:
  ${DEFAULT_SNAPSHOT}

Default output:
  ${DEFAULT_OUT}
`);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
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

function flattenProducts(snapshot) {
  return Object.values(snapshot.product_samples ?? {}).flatMap((sample) =>
    (sample.products ?? []).map((product) => ({
      provider: product.provider,
      product_group: product.product_group,
      raw_product_name: product.raw_product_name,
      premium_text: product.premium_text,
      e_insmarket_product_code: product.e_insmarket_product_code ?? null,
      official_product_url: product.official_product_url,
    })),
  );
}

function selectRepresentativeProducts(snapshot, limit) {
  const products = flattenProducts(snapshot).filter(
    (product) => product.official_product_url,
  );
  const selected = [];
  const usedProviders = new Set();

  for (const provider of TARGET_PROVIDERS) {
    const product = products.find(
      (candidate) => candidate.provider === provider && !usedProviders.has(provider),
    );
    if (product) {
      selected.push(product);
      usedProviders.add(provider);
    }
    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const product of products) {
    if (usedProviders.has(product.provider)) {
      continue;
    }
    selected.push(product);
    usedProviders.add(product.provider);
    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function selectProductsByCodes(snapshot, productCodes, limit) {
  const products = flattenProducts(snapshot);
  const productsByCode = new Map(
    products
      .filter((product) => product.e_insmarket_product_code)
      .map((product) => [product.e_insmarket_product_code, product]),
  );
  const selected = [];
  const skipped = [];

  for (const productCode of productCodes) {
    const product = productsByCode.get(productCode);
    if (!product) {
      skipped.push(makeSkippedProduct(productCode, null, "not_in_snapshot"));
      continue;
    }
    if (!product.official_product_url) {
      skipped.push(makeSkippedProduct(productCode, product, "missing_official_product_url"));
      continue;
    }
    selected.push(product);
  }

  return {
    selected: selected.slice(0, limit),
    skipped,
  };
}

function makeSkippedProduct(productCode, product, reason) {
  return {
    provider: product?.provider ?? null,
    product_group: product?.product_group ?? null,
    raw_product_name: product?.raw_product_name ?? null,
    premium_text: product?.premium_text ?? null,
    e_insmarket_product_code: productCode,
    official_product_url: product?.official_product_url ?? null,
    reason,
  };
}

async function probeProduct(product, options) {
  const baseProbe = {
    ...product,
    page_status: "failed",
    http_status: null,
    final_url: null,
    content_type: null,
    pdf_candidates: [],
    notes: [],
  };

  try {
    const response = await fetchWithTimeout(product.official_product_url, {
      timeoutMs: options.timeoutMs,
      accept: "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
    });
    const contentType = response.headers.get("content-type");
    const contentLength = parseContentLength(response.headers.get("content-length"));

    baseProbe.page_status = response.ok ? "accessible" : "http_error";
    baseProbe.http_status = response.status;
    baseProbe.final_url = response.url;
    baseProbe.content_type = contentType;

    if (isPdfContent(product.official_product_url, contentType)) {
      const pdfCandidate = await hashPdfResponse(
        product.official_product_url,
        response,
        contentLength,
        options,
      );
      return {
        ...baseProbe,
        pdf_candidates: [pdfCandidate],
      };
    }

    const html = await response.text();
    const pdfUrls = extractPdfUrls(html, response.url).slice(0, 5);

    if (pdfUrls.length === 0) {
      baseProbe.notes.push("No PDF links were found in the official product page HTML.");
      return baseProbe;
    }

    const pdfCandidates = [];
    for (const pdfUrl of pdfUrls) {
      pdfCandidates.push(await probePdfUrl(pdfUrl, { ...options, referer: response.url }));
    }

    return {
      ...baseProbe,
      pdf_candidates: pdfCandidates,
    };
  } catch (error) {
    return {
      ...baseProbe,
      error: error instanceof Error ? error.message : String(error),
    };
  }
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

async function probePdfUrl(url, options) {
  try {
    const response = await fetchWithTimeout(url, {
      timeoutMs: options.timeoutMs,
      accept: "application/pdf,*/*",
    });
    const contentType = response.headers.get("content-type");
    const contentLength = parseContentLength(response.headers.get("content-length"));

    if (!response.ok) {
      return makePdfCandidate(url, "http_error", response.status, contentType, contentLength);
    }

    return await hashPdfResponse(url, response, contentLength, options);
  } catch (error) {
    return {
      ...makePdfCandidate(url, "failed", null, null, null),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function hashPdfResponse(url, response, contentLength, options) {
  const contentType = response.headers.get("content-type");

  if (contentLength !== null && contentLength > options.maxPdfBytes) {
    return makePdfCandidate(
      url,
      "skipped_large_pdf",
      response.status,
      contentType,
      contentLength,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > options.maxPdfBytes) {
    return makePdfCandidate(
      url,
      "skipped_large_pdf",
      response.status,
      contentType,
      buffer.length,
    );
  }

  const looksLikePdf = buffer.subarray(0, 4).toString("utf8") === "%PDF";
  if (!looksLikePdf && !String(contentType ?? "").toLowerCase().includes("application/pdf")) {
    return makePdfCandidate(
      url,
      "non_pdf_response",
      response.status,
      contentType,
      buffer.length,
    );
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");

  return {
    ...makePdfCandidate(url, "hashed", response.status, contentType, buffer.length),
    sha256,
    retrieved_at: DateTime.now().setZone("Asia/Seoul").toISO(),
  };
}

function makePdfCandidate(url, status, httpStatus, contentType, contentLengthBytes) {
  return {
    url,
    status,
    http_status: httpStatus,
    content_type: contentType,
    content_length_bytes: contentLengthBytes,
    sha256: null,
    retrieved_at: null,
  };
}

function isPdfContent(url, contentType) {
  return (
    String(contentType ?? "").toLowerCase().includes("application/pdf") ||
    new URL(url).pathname.toLowerCase().endsWith(".pdf")
  );
}

function parseContentLength(value) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
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

async function writeJson(path, value) {
  const absoluteOut = resolve(process.cwd(), path);
  await mkdir(dirname(absoluteOut), { recursive: true });
  await writeFile(absoluteOut, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return absoluteOut;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshotPath = resolve(process.cwd(), args.snapshot);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const selection =
    args.productCodes.length > 0
      ? selectProductsByCodes(snapshot, args.productCodes, args.limit)
      : { selected: selectRepresentativeProducts(snapshot, args.limit), skipped: [] };
  const selectedProducts = selection.selected;
  const probes = [];

  for (const product of selectedProducts) {
    probes.push(await probeProduct(product, args));
  }

  const result = ProbeResultSchema.parse({
    metadata: {
      generated_at: DateTime.now().setZone("Asia/Seoul").toISO(),
      timezone: "Asia/Seoul",
      generator: "scripts/insurance/collect-product-documents.mjs",
      input_snapshot: args.snapshot,
      output_version: "1.1",
      target_limit: args.limit,
      target_product_codes: args.productCodes,
    },
    selected_products: selectedProducts,
    probes,
    skipped_products: selection.skipped,
    qa: {
      service_db_ready: false,
      blockers: [
        "A product is not seed-ready until official terms or summary PDF is hashed and human-reviewed.",
        "Many direct product pages are JavaScript landing pages and may not expose PDF links in initial HTML.",
        "coverage_category and risk_targets still require human approval.",
      ],
      next_actions: [
        "Add carrier disclosure-page crawling for products whose direct landing pages do not expose PDFs.",
        "Create a review CSV that combines e-insmarket rows with official PDF/hash evidence.",
        "Promote only approved products into insurance_product_sources or seed candidates.",
      ],
    },
  });

  const absoluteOut = await writeJson(args.out, result);
  const hashedPdfCount = probes.reduce(
    (sum, probe) =>
      sum + probe.pdf_candidates.filter((candidate) => candidate.status === "hashed").length,
    0,
  );

  console.log(`Product document probe written: ${absoluteOut}`);
  console.log(
    [
      `selected_products=${selectedProducts.length}`,
      `pages_accessible=${probes.filter((probe) => probe.page_status === "accessible").length}`,
      `pdf_candidates=${probes.reduce((sum, probe) => sum + probe.pdf_candidates.length, 0)}`,
      `hashed_pdfs=${hashedPdfCount}`,
    ].join(" "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
