#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { DateTime } from "luxon";
import { z } from "zod";

const DEFAULT_INPUT = "data/insurance/latest_premium_quote_probe.json";
const DEFAULT_OUT = "data/insurance/latest_premium_quote_rows_apply.json";
const DEFAULT_ENV_FILE = ".env.local";
const KST_ZONE = "Asia/Seoul";

const ConditionSchema = z.object({
  condition_id: z.string().min(1),
  age: z.number().int().min(0).max(120),
  sex: z.enum(["male", "female"]),
  source_sex_codes: z.object({
    cancer: z.string().min(1),
    medical: z.string().min(1),
  }),
});

const QuoteRowSchema = z.object({
  condition_id: z.string().min(1),
  source_id: z.string().min(1),
  product_group: z.string().min(1),
  quote_source_url: z.string().url(),
  quote_method: z.string().min(1),
  quote_params_json: z.string().refine(isJsonString, "quote_params_json must be JSON"),
  response_hash_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  provider: z.string().min(1),
  raw_product_name: z.string().min(1),
  e_insmarket_product_code: z.string().nullable(),
  premium_text: z.string().nullable(),
  monthly_premium_krw: z.number().int().positive().nullable(),
});

const ProbeSchema = z.object({
  metadata: z.object({
    generated_at: z.string().min(1),
    timezone: z.string().min(1),
    generator: z.string().min(1),
    output_version: z.string().min(1),
  }),
  conditions: z.array(ConditionSchema),
  source_status: z.array(
    z.object({
      condition_id: z.string().min(1),
      source_id: z.string().min(1),
      product_group: z.string().min(1),
      method: z.string().min(1),
      url: z.string().url(),
      http_status: z.number().int().nullable(),
      status: z.string().min(1),
      evidence: z.string().min(1),
      response_hash_sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    }),
  ),
  quote_rows: z.array(QuoteRowSchema),
  qa: z.object({
    quote_requery_possible: z.boolean(),
    targets_with_premium_variation: z.array(z.unknown()),
    blockers: z.array(z.string()),
    next_actions: z.array(z.string()),
  }),
});

const SourceRowSchema = z.object({
  id: z.string().min(1),
  carrier_id: z.string().min(1),
  raw_product_name: z.string().min(1),
  product_group: z.string().min(1),
  e_insmarket_product_code: z.string().min(1),
  renewal_type: z.string().nullable(),
});

function parseArgs(argv) {
  const args = {
    apply: false,
    envFile: DEFAULT_ENV_FILE,
    input: DEFAULT_INPUT,
    out: DEFAULT_OUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--apply") {
      args.apply = true;
    } else if (arg === "--env-file") {
      args.envFile = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--input") {
      args.input = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--out") {
      args.out = readArgValue(argv, index, arg);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.trim().length === 0) {
      throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} must not be empty`);
    }
  }

  return args;
}

function readArgValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  node scripts/insurance/apply-premium-quotes.mjs [--input path] [--out path] [--env-file .env.local] [--apply]

Default behavior:
  Dry-run only. Reads ${DEFAULT_INPUT}, maps rows to insurance_product_sources,
  writes ${DEFAULT_OUT}, and does not insert DB rows.

Apply mode:
  Pass --apply after confirming the target DB and completing a backup.
`);
}

function isJsonString(value) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function toUnixSeconds(isoValue, label) {
  const dateTime = DateTime.fromISO(isoValue, { setZone: true });
  if (!dateTime.isValid) {
    throw new Error(`${label} is not a valid ISO timestamp: ${isoValue}`);
  }
  return Math.floor(dateTime.toSeconds());
}

function getProductFamily(row) {
  if (row.source_id.includes("medical") || row.product_group.includes("실손")) {
    return "medical";
  }
  return "cancer";
}

function toQuoteId(productSourceId, conditionId, responseHash) {
  return `quote_${productSourceId}_${conditionId}_${responseHash.slice(0, 12)}`;
}

function groupByReason(skippedRows) {
  const counts = new Map();
  for (const row of skippedRows) {
    counts.set(row.reason, (counts.get(row.reason) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function summarizeMappedRows(mappedRows) {
  const bySource = new Map();

  for (const row of mappedRows) {
    const summary = bySource.get(row.productSourceId) ?? {
      product_source_id: row.productSourceId,
      carrier_id: row.carrierId,
      e_insmarket_product_code: row.eInsmarketProductCode,
      raw_product_name: row.rawProductName,
      product_group: row.productGroup,
      row_count: 0,
      numeric_premium_count: 0,
      null_premium_count: 0,
      conditions: [],
      premiums_krw: [],
    };

    summary.row_count += 1;
    summary.conditions.push(row.conditionId);
    if (row.monthlyPremiumKrw === null) {
      summary.null_premium_count += 1;
    } else {
      summary.numeric_premium_count += 1;
      summary.premiums_krw.push(row.monthlyPremiumKrw);
    }
    bySource.set(row.productSourceId, summary);
  }

  return [...bySource.values()].sort((a, b) =>
    a.product_source_id.localeCompare(b.product_source_id),
  );
}

async function readProbe(inputPath) {
  const raw = await readFile(inputPath, "utf8");
  return ProbeSchema.parse(JSON.parse(raw));
}

async function fetchSourceRows(client) {
  const result = await client.execute(`
    SELECT
      id,
      carrier_id,
      raw_product_name,
      product_group,
      e_insmarket_product_code,
      renewal_type
    FROM insurance_product_sources
    WHERE e_insmarket_product_code IS NOT NULL
  `);

  return result.rows.map((row) => SourceRowSchema.parse(row));
}

async function countPremiumQuotes(client) {
  const result = await client.execute("SELECT COUNT(*) AS count FROM insurance_premium_quotes");
  return Number(result.rows[0]?.count ?? 0);
}

async function fetchExistingQuoteKeys(client) {
  const result = await client.execute(`
    SELECT
      product_source_id,
      age,
      sex,
      source_sex_code,
      payment_cycle,
      premium_text,
      monthly_premium_krw,
      quote_params_json
    FROM insurance_premium_quotes
  `);

  return new Set(result.rows.map(toExistingQuoteKey));
}

function keyValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function toQuoteKey({
  productSourceId,
  age,
  sex,
  sourceSexCode,
  paymentCycle,
  premiumText,
  monthlyPremiumKrw,
  quoteParamsJson,
}) {
  return [
    productSourceId,
    age,
    sex,
    sourceSexCode,
    paymentCycle,
    premiumText,
    monthlyPremiumKrw,
    quoteParamsJson,
  ].map(keyValue).join("|");
}

function toExistingQuoteKey(row) {
  return [
    row.product_source_id,
    row.age,
    row.sex,
    row.source_sex_code,
    row.payment_cycle,
    row.premium_text,
    row.monthly_premium_krw,
    row.quote_params_json,
  ].map(keyValue).join("|");
}

function buildQuoteRows(probe, sourceRows) {
  const conditionsById = new Map(
    probe.conditions.map((condition) => [condition.condition_id, condition]),
  );
  const sourcesByProductCode = new Map(
    sourceRows.map((source) => [source.e_insmarket_product_code, source]),
  );
  const retrievedAt = toUnixSeconds(probe.metadata.generated_at, "metadata.generated_at");
  const createdAt = Math.floor(DateTime.now().setZone(KST_ZONE).toSeconds());
  const mappedRows = [];
  const skippedRows = [];

  for (const row of probe.quote_rows) {
    if (!row.e_insmarket_product_code) {
      skippedRows.push({
        condition_id: row.condition_id,
        provider: row.provider,
        raw_product_name: row.raw_product_name,
        reason: "missing_product_code",
      });
      continue;
    }

    const condition = conditionsById.get(row.condition_id);
    if (!condition) {
      skippedRows.push({
        condition_id: row.condition_id,
        provider: row.provider,
        raw_product_name: row.raw_product_name,
        e_insmarket_product_code: row.e_insmarket_product_code,
        reason: "unknown_condition",
      });
      continue;
    }

    const source = sourcesByProductCode.get(row.e_insmarket_product_code);
    if (!source) {
      skippedRows.push({
        condition_id: row.condition_id,
        provider: row.provider,
        raw_product_name: row.raw_product_name,
        e_insmarket_product_code: row.e_insmarket_product_code,
        reason: "not_in_source_catalog",
      });
      continue;
    }

    const productFamily = getProductFamily(row);
    const sourceSexCode = condition.source_sex_codes[productFamily];

    mappedRows.push({
      id: toQuoteId(source.id, row.condition_id, row.response_hash_sha256),
      productSourceId: source.id,
      carrierId: source.carrier_id,
      age: condition.age,
      sex: condition.sex,
      sourceSexCode,
      paymentCycle: "monthly",
      paymentPeriodYears: null,
      insurancePeriodYears: null,
      coverageAmountKrw: null,
      planName: null,
      renewalType: source.renewal_type,
      ridersJson: null,
      premiumCurrency: "KRW",
      monthlyPremiumKrw: row.monthly_premium_krw,
      premiumText: row.premium_text,
      quoteSourceType: "e_insmarket",
      quoteSourceUrl: row.quote_source_url,
      quoteParamsJson: row.quote_params_json,
      quoteHashSha256: row.response_hash_sha256,
      retrievedAt,
      reviewStatus: "needs_review",
      createdAt,
      conditionId: row.condition_id,
      eInsmarketProductCode: row.e_insmarket_product_code,
      rawProductName: source.raw_product_name,
      productGroup: source.product_group,
    });
  }

  return { mappedRows, skippedRows };
}

async function insertQuoteRows(client, rows) {
  let insertedRows = 0;

  for (const row of rows) {
    const result = await client.execute({
      sql: `
        INSERT INTO insurance_premium_quotes (
          id,
          product_source_id,
          carrier_id,
          age,
          sex,
          source_sex_code,
          payment_cycle,
          payment_period_years,
          insurance_period_years,
          coverage_amount_krw,
          plan_name,
          renewal_type,
          riders_json,
          premium_currency,
          monthly_premium_krw,
          premium_text,
          quote_source_type,
          quote_source_url,
          quote_params_json,
          quote_hash_sha256,
          retrieved_at,
          review_status,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `,
      args: [
        row.id,
        row.productSourceId,
        row.carrierId,
        row.age,
        row.sex,
        row.sourceSexCode,
        row.paymentCycle,
        row.paymentPeriodYears,
        row.insurancePeriodYears,
        row.coverageAmountKrw,
        row.planName,
        row.renewalType,
        row.ridersJson,
        row.premiumCurrency,
        row.monthlyPremiumKrw,
        row.premiumText,
        row.quoteSourceType,
        row.quoteSourceUrl,
        row.quoteParamsJson,
        row.quoteHashSha256,
        row.retrievedAt,
        row.reviewStatus,
        row.createdAt,
      ],
    });

    insertedRows += Number(result.rowsAffected ?? 0);
  }

  return insertedRows;
}

function buildSummary({
  args,
  probe,
  sourceRows,
  mappedRows,
  semanticDuplicateRows,
  insertRows,
  skippedRows,
  tableCountBefore,
  tableCountAfter,
  insertedRows,
}) {
  return {
    metadata: {
      generated_at: DateTime.now().setZone(KST_ZONE).toISO(),
      timezone: KST_ZONE,
      generator: "scripts/insurance/apply-premium-quotes.mjs",
      mode: args.apply ? "apply" : "dry_run",
      input: args.input,
      source_probe_generated_at: probe.metadata.generated_at,
    },
    source_catalog: {
      rows_with_e_insmarket_code: sourceRows.length,
      matched_product_sources: summarizeMappedRows(mappedRows),
    },
    quote_rows: {
      source_total: probe.quote_rows.length,
      matched_total: mappedRows.length,
      semantic_duplicate_total: semanticDuplicateRows.length,
      insert_candidate_total: insertRows.length,
      skipped_total: skippedRows.length,
      skipped_by_reason: groupByReason(skippedRows),
      inserted_rows: insertedRows,
      table_count_before: tableCountBefore,
      table_count_after: tableCountAfter,
      review_status_for_inserted_rows: "needs_review",
    },
    source_status: {
      inaccessible_or_error_count: probe.source_status.filter(
        (status) => status.status !== "accessible",
      ).length,
      errors: probe.source_status
        .filter((status) => status.status !== "accessible")
        .map((status) => ({
          condition_id: status.condition_id,
          source_id: status.source_id,
          product_group: status.product_group,
          http_status: status.http_status,
          evidence: status.evidence,
        })),
    },
    qa: {
      quote_requery_possible: probe.qa.quote_requery_possible,
      blockers: probe.qa.blockers,
      next_actions: buildNextActions({ isApply: args.apply, probe }),
    },
  };
}

function buildNextActions({ isApply, probe }) {
  if (!isApply) {
    return probe.qa.next_actions;
  }

  return [
    "적재된 quote row를 needs_review 상태로 유지하고 매칭 키워드와 보험료 기준을 검수한다.",
    "실손의료보험 가입담보 A/B 외 E~J 특약 조합은 별도 quote dimension으로 확장한다.",
    "사용자 UI에서는 대표 보험료와 조건별 예상 보험료를 분리해서 표시한다.",
  ];
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const outPath = resolve(args.out);

  config({ path: args.envFile, quiet: true });

  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error(`TURSO_DATABASE_URL is required. Checked env file: ${args.envFile}`);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const probe = await readProbe(inputPath);
  const sourceRows = await fetchSourceRows(client);
  const { mappedRows, skippedRows } = buildQuoteRows(probe, sourceRows);
  const existingQuoteKeys = await fetchExistingQuoteKeys(client);
  const semanticDuplicateRows = mappedRows.filter((row) =>
    existingQuoteKeys.has(toQuoteKey(row)),
  );
  const insertRows = mappedRows.filter((row) => !existingQuoteKeys.has(toQuoteKey(row)));
  const tableCountBefore = await countPremiumQuotes(client);
  const insertedRows = args.apply ? await insertQuoteRows(client, insertRows) : 0;
  const tableCountAfter = await countPremiumQuotes(client);
  const summary = buildSummary({
    args,
    probe,
    sourceRows,
    mappedRows,
    semanticDuplicateRows,
    insertRows,
    skippedRows,
    tableCountBefore,
    tableCountAfter,
    insertedRows,
  });

  await writeJson(outPath, summary);

  console.log(`Mode: ${summary.metadata.mode}`);
  console.log(`Probe quote rows: ${summary.quote_rows.source_total}`);
  console.log(`Matched source rows: ${summary.quote_rows.matched_total}`);
  console.log(`Semantic duplicates: ${summary.quote_rows.semantic_duplicate_total}`);
  console.log(`Insert candidates: ${summary.quote_rows.insert_candidate_total}`);
  console.log(`Skipped rows: ${summary.quote_rows.skipped_total}`);
  console.log(`Inserted rows: ${summary.quote_rows.inserted_rows}`);
  console.log(`Table count: ${summary.quote_rows.table_count_before} -> ${summary.quote_rows.table_count_after}`);
  console.log(`Summary: ${args.out}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
