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
    source_url: "https://www.idblife.com/notice/product/prov/sale/9532",
    api_searches: [
      {
        kind: "dblife_prov_sale_terms",
        endpoint: "https://www.idblife.com/notice/product/prov/sale/9532",
        referer: "https://www.idblife.com/notice/product/sale",
        publish_no: "3196",
        file_gb: "3 ",
        file_seq: "65059",
        product_name: "(무)e로운 암보험(해약환급금 미지급형)(2601)",
        terms_file: "(무)e로운 암보험(해약환급금 미지급형)(2601)_약관",
        keywords: ["e로운 암보험", "해약환급금 미지급형", "2601", "암보험"],
      },
    ],
    notes: [
      "주계약 및 특약 약관 페이지는 서버 렌더링 HTML로 문서 링크를 제공한다.",
      "공식 파일 다운로드는 브라우저 User-Agent와 공시 페이지 Referer를 포함해야 PDF를 반환한다.",
    ],
  },
  농협손보: {
    provider: "농협손보",
    source_url: "https://www.nhfire.co.kr/product/retrieveProduct.nhfire?pdtCd=D711117",
    api_searches: [
      {
        kind: "nhfire_product_page_downloads",
        endpoint: "https://www.nhfire.co.kr/product/retrieveProduct.nhfire?pdtCd=D711117",
        product_code: "D711117",
        product_name: "(무) 헤아림다이렉트실손의료비보험(전환계약용)2605",
        keywords: [
          "헤아림실손의료비보험2605",
          "헤아림다이렉트실손의료비보험",
          "실손의료비보험",
          "전환계약용",
          "2605",
        ],
      },
    ],
    notes: [
      "상품 상세 페이지의 fnPdtFileDownload(fileId, afileSeqn, afileNm) 호출에서 약관 다운로드 식별자를 조회한다.",
      "실제 PDF는 /imageView/downloadFile.ajax?fileId=...&afileSeqn=... query로 다운로드된다.",
    ],
  },
  교보라이프플래닛: {
    provider: "교보라이프플래닛",
    source_url: "https://www.lifeplanet.co.kr/disclosure/good/HPDA01S0.dev",
    api_searches: [
      {
        kind: "lifeplanet_disclosure_good",
        endpoint: "https://www.lifeplanet.co.kr/disclosure/good/HPDA01S0.dev",
        product_code: "10054",
        product_name: "(무)교보라플 비갱신암보험",
        keywords: [
          "교보라플 비갱신암보험",
          "비갱신암보험",
          "해약환급금 미지급형",
          "비흡연체",
          "표준체",
        ],
      },
    ],
    notes: [
      "공시실 HPDA01S0 화면의 ProdMainList JSON에서 판매중 상품과 문서 파일명을 조회한다.",
      "공식 문서는 /common/file/FileDownload.dev의 fileName/downloadPathType query로 다운로드한다.",
    ],
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
    api_searches: [
      {
        kind: "hyundai_direct_terms",
        endpoint: "https://mdirect.hi.co.kr/DH.json",
        referer: "https://mdirect.hi.co.kr/service.do?m=b520586974",
        tran_id: "DHMT9100M01S",
        product_code: "12M2",
        product_name: "(무)현대해상다이렉트실손의료비보장보험(갱신형)(Hi2605)",
        keywords: ["현대해상다이렉트실손의료비보장보험", "실손의료비보장보험", "Hi2605"],
      },
    ],
    notes: [
      "상품공시 검색 화면은 JavaScript 검색 결과와 다운로드 버튼을 함께 사용한다.",
      "다이렉트 상품 페이지의 DH.json 상품 설명 API에서 약관 PDF 경로를 조회한다.",
    ],
  },
  KB손보: {
    provider: "KB손보",
    source_url: "https://www.kbinsure.co.kr/CG804030001.ec",
    api_searches: [
      {
        kind: "kb_direct_terms",
        endpoint: "https://m.kbinsure.co.kr:8547/dctapp/scripts2/services/glCommonCode_DA.js",
        referer: "https://m.kbinsure.co.kr:8547/dctapp/main.html#/GLM/RD/LT_CM0101M",
        product_name: "KB손보 다이렉트실손의료비보장보험(무배당)(26.05)",
        product_code: "Medical_Self",
        policy_code: "25192",
        terms_file: "KB_Direct_Medical(25192)_202605.pdf",
        terms_url:
          "https://m.kbinsure.co.kr:8547/dctapp/views/terms/KB_Direct_Medical(25192)_202605.pdf",
        keywords: ["KB손보", "다이렉트실손의료비보장보험", "실손의료비보장보험", "26.05"],
      },
    ],
    notes: [
      "KB손보 공시 페이지 일부는 EUC-KR 인코딩이며 문서 다운로드는 별도 fileNm 경로를 사용한다.",
      "다이렉트 모바일 glCommonCode Medical_Self 항목에서 현재 약관 PDF 파일명을 조회한다.",
    ],
  },
  메리츠화재: {
    provider: "메리츠화재",
    source_url: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
    api_searches: [
      {
        kind: "meritz_direct_pdf_list",
        endpoint: "https://store.meritzfire.com/json.smart",
        download_endpoint: "https://store.meritzfire.com/hp/fileDownload.do",
        referer: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
        screen_id: "DMI1805NI000001",
        product_code: "6ADGE",
        product_name: "(무) 메리츠 다이렉트 실손의료비보험2605",
        keywords: ["메리츠 다이렉트 실손의료비보험", "실손의료비보험", "2605", "6ADGE"],
      },
    ],
    notes: [
      "상품 페이지의 downPdf handler가 pdClusPdf.downPdClus('6ADGE')를 호출한다.",
      "PDF 목록은 /json.smart retrievePdfFileLst API로 조회하고, 다운로드는 같은 세션 쿠키와 암호화된 atcFilePthNm#[E] 값을 /hp/fileDownload.do에 전달해야 한다.",
    ],
  },
  흥국화재: {
    provider: "흥국화재",
    source_url: "https://direct.heungkukfire.co.kr/?ccid=0606001007#/CMMOBDPRM4001",
    api_searches: [
      {
        kind: "heungkuk_direct_download_file",
        endpoint: "https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do",
        referer: "https://direct.heungkukfire.co.kr/?ccid=0606001007",
        screen_id: "CMMOBDPRM4001",
        product_type: "4",
        file_type: "4",
        terms_file: "eYou_mdca_term_next.pdf",
        product_name: "(무)흥Good 다이렉트 실손의료보험(26.05)",
        keywords: ["흥Good 다이렉트 실손의료보험", "실손의료보험", "26.05"],
      },
    ],
    notes: [
      "다이렉트 실손 화면 CMMOBDPRM4001의 약관 버튼은 downloadFile(this, '4', 'eYou_mdca_term_next.pdf')를 호출한다.",
      "CM_COMM_FileDownload_ACT.do는 같은 파일명을 GET query로 전달해도 공식 PDF를 반환한다.",
    ],
  },
  한화손보: {
    provider: "한화손보",
    source_url: "https://www.hanwhadirect.com/",
    api_searches: [
      {
        kind: "hanwha_direct_terms_pdf",
        script_url:
          "https://www.hanwhadirect.com/resource/inspl/ltr/cncr/js/main.js?sid=20260601",
        referer: "https://www.hanwhadirect.com/ltr/cncr/",
        base_url: "https://www.hanwhadirect.com",
        terms_file: "LA02969001.pdf",
        user_agent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        product_name: "한화 다이렉트 내가고른 암보험 무배당 2604",
        keywords: ["내가고른 암보험", "암보험", "2604", "LA02969001"],
      },
    ],
    notes: [
      "다이렉트 내가고른 암보험 화면의 약관 다운로드 버튼은 ltr/cncr main.js에서 /clapdf/LA02969001.pdf를 호출한다.",
      "landing.do는 세션 쿠키가 없으면 error page로 이동할 수 있어 crawler는 공식 JS와 clapdf PDF 경로를 직접 검증한다.",
    ],
  },
  미래에셋생명: {
    provider: "미래에셋생명",
    source_url: "https://life.miraeasset.com/micro/disclosure/product/PC-HO-080301-000000.do",
    api_searches: [
      {
        kind: "miraeasset_disclosure_product_list",
        endpoint:
          "https://life.miraeasset.com/micro/disclosure/selectWorkDvsnDataPaging.do",
        download_endpoint: "https://life.miraeasset.com/micro/cmmnFileDown.do",
        referer:
          "https://life.miraeasset.com/micro/disclosure/product/PC-HO-080301-000000.do",
        work_dvsn: "D",
        sale_status: "판매중인상품",
        category: "온라인",
        keyword: "온라인 암보험",
        product_name: "온라인 암보험 무배당",
        keywords: [
          "온라인 암보험",
          "온라인 암보험 무배당",
          "기본형",
          "해약환급금이없는유형",
          "2026-05-01",
        ],
      },
    ],
    notes: [
      "상품공시 화면은 COMEXCEL.fn_getWorkDvsnDataPaging으로 /micro/disclosure/selectWorkDvsnDataPaging.do를 호출한다.",
      "문서 다운로드는 /micro/cmmnFileDown.do에 pathType, fileName, orgFileName, filePath query를 전달하면 공식 PDF를 반환한다.",
    ],
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
    api_searches: [
      {
        kind: "shinhanlife_disclosure_search",
        endpoint: "https://shinhanlife.co.kr/co/wcms/nodeInfoListPage.pwkjson",
        referer: "https://shinhanlife.co.kr/hp/cdhi0030.do",
        category_id: "M160991914330045272",
        keyword: "신한SOL암보험",
        product_name: "신한SOL암보험(무배당, 해약환급금 미지급형)",
        page_size: 50,
      },
    ],
    notes: [
      "대표 공시실 진입 페이지에서 상품공시 하위 경로를 추가 추적해야 한다.",
      "상품공시 화면의 wcms API에서 판매중 상품과 PDF 경로를 조회한다.",
    ],
  },
  삼성생명: {
    provider: "삼성생명",
    source_url: "https://www.samsunglife.com",
    api_searches: [
      {
        kind: "samsunglife_policy_url",
        endpoint: "https://direct.samsunglife.com/api/of/cm/document/getPolicyUrl",
        referer: "https://direct.samsunglife.com/damoa.eds?cid=di:insmarket:damoa:insmarket:240513",
        pro_type: "65",
        product_name: "삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형)",
        keywords: ["삼성 인터넷 입원 건강보험", "입원 건강보험", "2601"],
      },
    ],
    notes: [
      "삼성생명 대표 사이트는 상품공시가 JavaScript 앱 내부에 있을 수 있다.",
      "다이렉트 보험 문서 API에서 보험다모아 유입 상품의 통합약관 PDF 경로를 조회한다.",
    ],
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
    try {
      const apiRecords = await fetchApiSearchRecords(search, options);
      records.push(...apiRecords);
      notes.push(
        `${profile.provider} API search '${formatApiSearchLabel(search)}' returned ${apiRecords.length} records.`,
      );
    } catch (error) {
      notes.push(
        `${profile.provider} API search '${formatApiSearchLabel(search)}' failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return { records, notes };
}

async function fetchApiSearchRecords(search, options) {
  if (search.kind === "dbins_product_search") {
    return await fetchDbInsuranceProductRecords(search, options);
  }
  if (search.kind === "dblife_prov_sale_terms") {
    return await fetchDbLifeProvSaleTermsRecords(search, options);
  }
  if (search.kind === "nhfire_product_page_downloads") {
    return await fetchNhFireProductPageDownloadRecords(search, options);
  }
  if (search.kind === "hyundai_direct_terms") {
    return await fetchHyundaiDirectTermsRecords(search, options);
  }
  if (search.kind === "kb_direct_terms") {
    return fetchKbDirectTermsRecords(search);
  }
  if (search.kind === "meritz_direct_pdf_list") {
    return await fetchMeritzDirectPdfListRecords(search, options);
  }
  if (search.kind === "heungkuk_direct_download_file") {
    return fetchHeungkukDirectDownloadFileRecords(search);
  }
  if (search.kind === "hanwha_direct_terms_pdf") {
    return await fetchHanwhaDirectTermsPdfRecords(search, options);
  }
  if (search.kind === "miraeasset_disclosure_product_list") {
    return await fetchMiraeassetDisclosureProductListRecords(search, options);
  }
  if (search.kind === "samsunglife_policy_url") {
    return await fetchSamsungLifePolicyRecords(search, options);
  }
  if (search.kind === "shinhanlife_disclosure_search") {
    return await fetchShinhanLifeDisclosureRecords(search, options);
  }
  if (search.kind === "lifeplanet_disclosure_good") {
    return await fetchLifeplanetDisclosureGoodRecords(search, options);
  }

  throw new Error(`Unsupported API search kind: ${search.kind}`);
}

function formatApiSearchLabel(search) {
  return (
    search.keyword ??
    search.product_name ??
    search.product_code ??
    search.pro_type ??
    search.kind
  );
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

async function fetchDbLifeProvSaleTermsRecords(search, options) {
  const browserUserAgent =
    search.user_agent ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    headers: {
      "User-Agent": browserUserAgent,
      Referer: search.referer,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const html = decodeHtml(buffer, parseCharset(response.headers.get("content-type")));
  const links = extractLinks(html, response.url);
  const targetLink = links.find((link) => link.href.includes(`fileSeq=${search.file_seq}`));

  if (!targetLink) {
    throw new Error(`Missing DB Life terms link fileSeq=${search.file_seq}`);
  }

  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.terms_file,
          targetLink.text,
          targetLink.title,
          targetLink.href,
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links: [
        {
          url: makeDbLifeProvFileUrl(search),
          href: targetLink.href,
          text: "보험약관",
          title: targetLink.title || `${search.product_name} 보험약관`,
          document_type: "terms",
          discovered_from: search.endpoint,
          headers: {
            "User-Agent": browserUserAgent,
            Referer: search.endpoint,
          },
        },
      ],
    },
  ];
}

function makeDbLifeProvFileUrl(search) {
  const url = new URL("https://www.idblife.com/notice/product/prov/file");
  url.searchParams.set("publishNo", search.publish_no);
  url.searchParams.set("fileGb", search.file_gb);
  url.searchParams.set("fileSeq", search.file_seq);
  return url.toString();
}

async function fetchNhFireProductPageDownloadRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const html = decodeHtml(buffer, parseCharset(response.headers.get("content-type")));
  const links = extractNhFireProductDownloadLinks(html, search);
  if (links.length === 0) {
    throw new Error("Missing fnPdtFileDownload document links");
  }

  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.product_code,
          ...links.map((link) => `${link.text} ${link.title} ${link.href}`),
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links,
    },
  ];
}

function extractNhFireProductDownloadLinks(html, search) {
  const links = [];
  const downloadPattern =
    /fnPdtFileDownload\(\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*,\s*["']([^"']*)["']\s*\)/g;

  for (const match of html.matchAll(downloadPattern)) {
    const fileId = htmlDecode(match[1]).trim();
    const afileSeqn = htmlDecode(match[2]).trim();
    const fileName = htmlDecode(match[3]).trim();
    if (!fileId || !afileSeqn || !fileName) {
      continue;
    }

    const linkText = inferNhFireDocumentLabel(html, match.index ?? 0, fileName);
    links.push({
      url: makeNhFireDownloadUrl(fileId, afileSeqn),
      href: fileName,
      text: linkText,
      title: `${search.product_name} ${linkText}`,
      document_type: inferDocumentType(`${linkText} ${fileName}`),
      discovered_from: search.endpoint,
    });
  }

  return uniqueBy(links, (link) => `${link.url}|${link.href}`);
}

function inferNhFireDocumentLabel(html, matchIndex, fileName) {
  const context = html.slice(Math.max(0, matchIndex - 240), matchIndex + 240);
  const text = cleanText(context);
  if (text.includes("약관") || fileName.includes("약관")) {
    return "약관";
  }
  if (text.includes("안내장") || fileName.includes("안내장")) {
    return "안내장";
  }
  return inferDocumentType(fileName);
}

function makeNhFireDownloadUrl(fileId, afileSeqn) {
  const url = new URL("https://www.nhfire.co.kr/imageView/downloadFile.ajax");
  url.searchParams.set("fileId", fileId);
  url.searchParams.set("afileSeqn", afileSeqn);
  return url.toString();
}

async function fetchMeritzDirectPdfListRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json,text/plain,*/*",
    contentType: "application/json; charset=UTF-8",
    headers: {
      Origin: "https://store.meritzfire.com",
      Referer: search.referer,
    },
    body: JSON.stringify({
      header: makeMeritzJsonSmartHeader(
        "f.cg.he.ct.tm.o.bc.CtrCnfBc.retrievePdfFileLst",
        search.screen_id,
      ),
      body: {
        pdCd: search.product_code,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const sessionCookie = extractResponseCookieHeader(response);
  const payload = await response.json();
  if (payload?.header?.prcesResultDivCd !== "0") {
    throw new Error(`Meritz API returned non-success result: ${payload?.msg?.standMsg ?? "unknown"}`);
  }

  const pdfList = payload?.body?.pdfList ?? [];
  if (pdfList.length === 0) {
    throw new Error("Missing Meritz PDF list");
  }

  const links = pdfList
    .map((item) => makeMeritzDocumentLink(item, search, sessionCookie))
    .filter(Boolean);

  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.product_code,
          ...links.map((link) => `${link.text} ${link.title} ${link.href}`),
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links,
    },
  ];
}

function makeMeritzJsonSmartHeader(serviceId, screenId) {
  return {
    encryDivCd: "0",
    globId: "",
    rcvmsgSrvId: serviceId,
    resultRcvmsgSrvId: "",
    esbIntfId: "",
    exsIntfId: "",
    ipv6Addr1: "",
    ipv6Addr2: "",
    teleMsgMacAdr: "",
    envirInfoDivCd: "",
    firstTranssLcatgBizafairCd: "",
    transsLcatgBizafairCd: "",
    reqRespnsDivCd: "Q",
    syncDivCd: "S",
    teleMsgReqDttm: DateTime.now().setZone("Asia/Seoul").toFormat("yyyyLLddHHmmssSSS"),
    prcesResultDivCd: "",
    teleMsgRespnsDttm: "",
    clienTrespnsDttm: "",
    handcapLcatgBizafairCd: "",
    teleMsgVerDivCd: "",
    langDivCd: "KR",
    belongGrpCd: "",
    empNo: "",
    empId: "",
    dptCd: "",
    hgrkDptCd: "",
    nxupDptCd: "",
    transGrpCd: "F",
    screenId,
    lowrnkScreenId: "",
    resveLet: "",
  };
}

function makeMeritzDocumentLink(item, search, sessionCookie) {
  const encryptedPath = item["atcFilePthNm#[E]"];
  if (!encryptedPath || !item.ortxtFileNm) {
    return null;
  }

  const downloadUrl = new URL(search.download_endpoint);
  downloadUrl.searchParams.set("path", encryptedPath);
  downloadUrl.searchParams.set("id", encryptedPath);
  downloadUrl.searchParams.set("orgFileName", item.ortxtFileNm);
  downloadUrl.searchParams.set("pdfView", "Y");

  const documentType = inferMeritzDocumentType(item.cmAtcFileCtgCd, item.ortxtFileNm);
  return {
    url: downloadUrl.toString(),
    href: item.atcFilePthNm ?? item.ortxtFileNm,
    text: meritzDocumentLabel(documentType),
    title: `${search.product_name} ${meritzDocumentLabel(documentType)} ${item.ortxtFileNm}`,
    document_type: documentType,
    discovered_from: search.endpoint,
    headers: {
      Referer: search.referer,
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    },
  };
}

function inferMeritzDocumentType(categoryCode, fileName) {
  if (categoryCode === "6103") {
    return "summary";
  }
  if (categoryCode === "6104") {
    return "business_method";
  }
  if (categoryCode === "6102") {
    return "terms";
  }
  return inferDocumentType(fileName);
}

function meritzDocumentLabel(documentType) {
  if (documentType === "summary") {
    return "상품요약서";
  }
  if (documentType === "business_method") {
    return "사업방법서";
  }
  if (documentType === "terms") {
    return "보험약관";
  }
  return "공시문서";
}

function extractResponseCookieHeader(response) {
  const rawCookie = response.headers.get("set-cookie");
  if (!rawCookie) {
    return "";
  }

  return rawCookie
    .split(/, (?=[^;,]+=)/g)
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function fetchHeungkukDirectDownloadFileRecords(search) {
  const termsUrl = makeHeungkukDirectDownloadUrl(search);
  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.screen_id,
          search.terms_file,
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links: [
        {
          url: termsUrl,
          href: search.terms_file,
          text: "보험약관",
          title: `${search.product_name} 보험약관 ${search.terms_file}`,
          document_type: "terms",
          discovered_from: search.referer,
        },
      ],
    },
  ];
}

function makeHeungkukDirectDownloadUrl(search) {
  const url = new URL(search.endpoint);
  url.searchParams.set("_SERVICE_", "CM_COMM_FileDownload_ACT");
  url.searchParams.set("_TYPE_", "M");
  url.searchParams.set("_PRODTYPE_", search.product_type);
  url.searchParams.set("scrId", search.screen_id);
  url.searchParams.set("fileType", search.file_type);
  url.searchParams.set("downFileName", search.terms_file);
  return url.toString();
}

async function fetchHanwhaDirectTermsPdfRecords(search, options) {
  const response = await fetchWithTimeout(search.script_url, {
    timeoutMs: options.timeoutMs,
    accept: "application/javascript,text/javascript,*/*",
    headers: {
      "User-Agent": search.user_agent,
      Referer: search.referer,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const script = await response.text();
  const pdfPaths = [...script.matchAll(/downPdf\(['"]([^'"]+\.pdf)['"]\)/gi)].map(
    (match) => match[1],
  );
  const targetPath = pdfPaths.find((path) => path.includes(search.terms_file));

  if (!targetPath) {
    throw new Error(`Terms PDF ${search.terms_file} was not found in Hanwha Direct script`);
  }

  const termsUrl = new URL(targetPath, search.base_url).toString();

  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.terms_file,
          "보험약관",
          "약관 다운로드",
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links: [
        {
          url: termsUrl,
          text: "보험약관",
          title: `${search.product_name} 보험약관 ${search.terms_file}`,
          document_type: "terms",
          discovered_from: search.script_url,
          headers: {
            "User-Agent": search.user_agent,
            Referer: search.referer,
          },
        },
      ],
    },
  ];
}

async function fetchMiraeassetDisclosureProductListRecords(search, options) {
  const body = new URLSearchParams({
    workDvsn: search.work_dvsn,
    text1: search.sale_status,
    text2: search.category,
    text3: search.keyword,
    pageNum: "0",
  });

  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json, text/javascript, */*; q=0.01",
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    headers: {
      Origin: "https://life.miraeasset.com",
      Referer: search.referer,
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const rows = (payload.list ?? [])
    .map((record) => parseMiraeassetDisclosureRow(record, search))
    .filter(Boolean);
  const activeRows = rows.filter((row) => !row.cell3);
  const targetRows = (activeRows.length > 0 ? activeRows : rows).filter((row) =>
    normalizeText(row.cell1).includes(normalizeText(search.product_name)),
  );

  if (targetRows.length === 0) {
    throw new Error("Missing Mirae Asset online cancer disclosure row");
  }

  return targetRows.map((row) => ({
    text: cleanText(
      [
        search.product_name,
        row.cell0,
        row.cell1,
        row.cell2,
        row.cell3,
        row.cell4,
        row.cell5,
        row.cell6,
        ...(search.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    ),
    links: makeMiraeassetDocumentLinks(row, search),
  }));
}

function parseMiraeassetDisclosureRow(record, search) {
  try {
    const row = JSON.parse(record.jsonData);
    return {
      cell0: String(row.cell0 ?? ""),
      cell1: String(row.cell1 ?? ""),
      cell2: String(row.cell2 ?? ""),
      cell3: String(row.cell3 ?? ""),
      cell4: String(row.cell4 ?? ""),
      cell5: String(row.cell5 ?? ""),
      cell6: String(row.cell6 ?? ""),
      cell7: String(row.cell7 ?? ""),
      discovered_from: search.endpoint,
    };
  } catch {
    return null;
  }
}

function makeMiraeassetDocumentLinks(row, search) {
  return [
    ["summary", row.cell4, "상품요약서"],
    ["terms", row.cell5, "보험약관"],
    ["business_method", row.cell6, "사업방법서"],
  ].flatMap(([documentType, fileNames, label]) =>
    splitMiraeassetFileNames(fileNames).map((fileName) => ({
      url: makeMiraeassetDownloadUrl(fileName, row.cell7, search.download_endpoint),
      href: `${row.cell7}${fileName}`,
      text: label,
      title: `${row.cell1} ${label} ${fileName}`,
      document_type: documentType,
      discovered_from: search.endpoint,
      headers: {
        Referer: search.referer,
      },
    })),
  );
}

function splitMiraeassetFileNames(value) {
  return String(value ?? "")
    .split(/\r?\n/g)
    .map((fileName) => fileName.trim())
    .filter(Boolean);
}

function makeMiraeassetDownloadUrl(fileName, filePath, downloadEndpoint) {
  const url = new URL(downloadEndpoint);
  url.searchParams.set("pathType", "gongci_u1");
  url.searchParams.set("fileName", fileName);
  url.searchParams.set("orgFileName", fileName);
  url.searchParams.set("filePath", `/uploadwas/life/${filePath}`);
  return url.toString();
}

function fetchKbDirectTermsRecords(search) {
  const termsUrl = normalizeHttpUrl(search.terms_url, search.endpoint);
  if (!termsUrl) {
    throw new Error("Missing KB Direct terms PDF URL");
  }

  return [
    {
      text: cleanText(
        [
          search.product_name,
          search.product_code,
          search.policy_code,
          search.terms_file,
          ...(search.keywords ?? []),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      links: [
        {
          url: termsUrl,
          href: search.terms_file,
          text: "보험약관",
          title: `${search.product_name} 보험약관`,
          document_type: "terms",
          discovered_from: search.endpoint,
        },
      ],
    },
  ];
}

async function fetchHyundaiDirectTermsRecords(search, options) {
  const body = new URLSearchParams({
    header: JSON.stringify(makeHyundaiDirectHeader(search.tran_id)),
    data: JSON.stringify({ prodCd: search.product_code }),
  });

  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json,text/plain,*/*",
    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
    headers: {
      Origin: "https://mdirect.hi.co.kr",
      Referer: search.referer,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const termsUrl = normalizeHttpUrl(payload?.data?.prodExplan, search.endpoint);
  if (!termsUrl) {
    throw new Error("Missing prodExplan PDF URL");
  }

  const text = cleanText(
    [
      search.product_name,
      search.product_code,
      ...(search.keywords ?? []),
      payload?.data?.prodExplan,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return [
    {
      text,
      links: [
        {
          url: termsUrl,
          href: payload.data.prodExplan,
          text: "상품약관",
          title: `${search.product_name} 상품약관`,
          document_type: "terms",
          discovered_from: search.endpoint,
        },
      ],
    },
  ];
}

function makeHyundaiDirectHeader(tranId) {
  return {
    userId: "",
    tranId,
    gId: "",
    channelId: "service.do",
    clientIp: "",
    menuId: "",
    responseCode: "",
    responseMessage: "",
    messageEnabled: "",
    deviceId: "",
    osId: "",
    osType: "",
    applicationVersion: "",
    applicationId: "",
    networkType: "",
    phoneNumber: "",
    compressYn: "",
    sessionKey: "",
  };
}

async function fetchSamsungLifePolicyRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json,text/plain,*/*",
    contentType: "application/json; charset=UTF-8",
    headers: {
      Origin: "https://direct.samsunglife.com",
      Referer: search.referer,
    },
    body: JSON.stringify({
      proType: search.pro_type,
      baseHeaderVo: {
        useChnlScCd: "PC",
        reqSrnUrl: "/damoa.eds",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const policy = payload?.data?.policy;
  const policyUrl = normalizeHttpUrl(policy?.fullPath, search.endpoint);
  if (!policyUrl) {
    throw new Error("Missing policy.fullPath PDF URL");
  }

  const policyName = policy.name ?? search.product_name;
  const text = cleanText(
    [search.product_name, policyName, search.pro_type, ...(search.keywords ?? [])]
      .filter(Boolean)
      .join(" "),
  );

  return [
    {
      text,
      links: [
        {
          url: policyUrl,
          href: policy.fullPath,
          text: "통합약관",
          title: policyName,
          document_type: "terms",
          discovered_from: search.endpoint,
        },
      ],
    },
  ];
}

async function fetchShinhanLifeDisclosureRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    method: "POST",
    accept: "application/json,text/javascript,*/*;q=0.01",
    contentType: "application/json; charset=UTF-8",
    headers: {
      Origin: "https://shinhanlife.co.kr",
      Referer: search.referer,
      "X-AJAX-CALL": "true",
      "Proworks-Body": "Y",
      "Proworks-Lang": "ko",
    },
    body: JSON.stringify({
      elData: {
        catId: search.category_id,
        pageSize: search.page_size ?? 50,
        pageIndex: 1,
        method: "selectListGoods",
        title: search.keyword,
        meta06: "TRUE",
        scrnId: "cdhi0030",
      },
      userHeader: {
        scrnId: "cdhi0030",
        appliDtptDutjCd: "DH",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  return (payload?.elData?.nodeInfoVoList ?? []).map((record) => ({
    text: cleanText(
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
    ),
    links: makeShinhanLifeDocumentLinks(record, search.endpoint),
  }));
}

function makeShinhanLifeDocumentLinks(record, discoveredFrom) {
  return [
    ["summary", record.meta09, "상품요약서"],
    ["business_method", record.meta10, "사업방법서"],
    ["terms", record.meta11, "판매약관"],
    ["medical", record.meta13, "실손/특약 문서"],
  ]
    .filter(([, path]) => Boolean(path))
    .map(([documentType, path, label]) => {
      const publicUrl = normalizeHttpUrl(
        toShinhanLifePublicFilePath(path, record.wsId),
        discoveredFrom,
      );
      return {
        url: publicUrl,
        href: path,
        text: label,
        title: `${record.meta05 ?? record.title ?? "신한라이프 상품"} ${label}`,
        document_type: documentType,
        discovered_from: discoveredFrom,
      };
    })
    .filter((link) => Boolean(link.url));
}

function toShinhanLifePublicFilePath(path, workspaceId) {
  const value = String(path);
  if (workspaceId && value.startsWith(`/repo/${workspaceId}`)) {
    return value.replace(`/repo/${workspaceId}`, "/bizxpress");
  }
  return value;
}

async function fetchLifeplanetDisclosureGoodRecords(search, options) {
  const response = await fetchWithTimeout(search.endpoint, {
    timeoutMs: options.timeoutMs,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const html = decodeHtml(buffer, parseCharset(response.headers.get("content-type")));
  const payload = extractJavascriptObjectAssignment(html, "result");
  const records = payload?.outData?.ProdMainList ?? [];
  const targetRecords = records.filter(
    (record) => String(record.rrsnPrdCd ?? "") === String(search.product_code),
  );

  return targetRecords.map((record) => ({
    text: cleanText(
      [
        search.product_name,
        record.prdNm,
        record.rrsnPrdCd,
        record.prdCd,
        record.saleYn === "Y" ? "판매중" : "판매중지",
        record.saleStYmd,
        record.saleEdYmd,
        ...(search.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" "),
    ),
    links: makeLifeplanetDocumentLinks(record, search.endpoint),
  }));
}

function makeLifeplanetDocumentLinks(record, discoveredFrom) {
  return [
    ["summary", record.prdSryPat, "상품요약서", "1"],
    ["business_method", record.prdMdPat, "사업방법서", "2"],
    ["terms", record.insTxtPat, "보험약관", "0"],
  ]
    .filter(([, fileName]) => Boolean(fileName))
    .map(([documentType, fileName, label, downloadPathType]) => ({
      url: makeLifeplanetDownloadUrl(fileName, downloadPathType),
      href: fileName,
      text: label,
      title: `${record.prdNm} ${label}`,
      document_type: documentType,
      discovered_from: discoveredFrom,
    }));
}

function makeLifeplanetDownloadUrl(fileName, downloadPathType) {
  const url = new URL("https://www.lifeplanet.co.kr/common/file/FileDownload.dev");
  url.searchParams.set("fileName", fileName);
  url.searchParams.set("downloadPathType", downloadPathType);
  return url.toString();
}

function extractJavascriptObjectAssignment(html, variableName) {
  const marker = `var ${variableName}`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Missing JavaScript variable: ${variableName}`);
  }

  const assignmentIndex = html.indexOf("=", markerIndex);
  const objectStart = html.indexOf("{", assignmentIndex);
  if (assignmentIndex < 0 || objectStart < 0) {
    throw new Error(`Missing JavaScript object assignment: ${variableName}`);
  }

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = objectStart; i < html.length; i += 1) {
    const char = html[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(objectStart, i + 1));
      }
    }
  }

  throw new Error(`Unterminated JavaScript object assignment: ${variableName}`);
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
        headers: link.headers,
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
      headers: candidate.headers,
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
      output_version: "1.1",
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
        "Add carrier-specific disclosure adapters for quote-only products that still have no profile.",
        "Manually verify the document variants for KDB Life, Hanwha Life, Shinhan Life, and Lifeplanet before source-document seeding.",
        "Promote only hash-backed and matching-keyword-reviewed products into service seed candidates.",
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
