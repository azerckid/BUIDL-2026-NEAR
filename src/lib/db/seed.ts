import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { DateTime } from "luxon";
import {
  insuranceCarriers,
  insuranceProducts,
  insuranceProductSources,
  insuranceSourceDocuments,
} from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

const now = DateTime.now().setZone("Asia/Seoul").toJSDate();
const reviewedAt = DateTime.fromISO("2026-05-28T02:34:41.374+09:00").toJSDate();

type InsuranceCarrierSeed = typeof insuranceCarriers.$inferInsert;
type InsuranceProductSourceSeed = typeof insuranceProductSources.$inferInsert;
type InsuranceSourceDocumentSeed = typeof insuranceSourceDocuments.$inferInsert;
type InsuranceProductSeed = typeof insuranceProducts.$inferInsert;

const COMMON_PREMIUM_BASIS =
  "보험다모아 비교 조건 기준 월 보험료입니다. 실제 보험료는 나이, 성별, 가입금액, 납입기간, 갱신 여부, 특약, 인수심사 결과에 따라 달라질 수 있습니다.";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const SOURCE_AWARE_CARRIERS: InsuranceCarrierSeed[] = [
  {
    id: "carrier_hanwha_life",
    nameKo: "한화생명",
    nameEn: "Hanwha Life",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: "https://www.hanwhalife.com",
    disclosureUrl: "https://direct.hanwhalife.com",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_shinhan_life",
    nameKo: "신한라이프생명",
    nameEn: "Shinhan Life",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: "https://www.shinhanlife.co.kr",
    disclosureUrl: "https://shinhanlife.co.kr",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_db_insurance",
    nameKo: "DB손보",
    nameEn: "DB Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: "https://www.idbins.com",
    disclosureUrl: "https://m.directdb.co.kr",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_kb_insurance",
    nameKo: "KB손보",
    nameEn: "KB Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: "https://www.kbinsure.co.kr",
    disclosureUrl: "https://m.kbinsure.co.kr",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_samsung_fire",
    nameKo: "삼성화재",
    nameEn: "Samsung Fire & Marine Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: "https://www.samsungfire.com",
    disclosureUrl: "https://direct.samsungfire.com",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_hyundai_marine",
    nameKo: "현대해상",
    nameEn: "Hyundai Marine & Fire Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: "https://www.hi.co.kr",
    disclosureUrl: "https://mdirect.hi.co.kr",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_samsung_life",
    nameKo: "삼성생명",
    nameEn: "Samsung Life",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: "https://www.samsunglife.com",
    disclosureUrl: "https://direct.samsunglife.com",
    isActive: 1,
    lastCheckedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
];

const SOURCE_AWARE_PRODUCT_SOURCES: InsuranceProductSourceSeed[] = [
  {
    id: "src_hanwha_life_e_cancer_202604",
    carrierId: "carrier_hanwha_life",
    rawProductName: "한화생명 e암보험(비갱신형)(무)(표준체형)",
    normalizedProductName: "한화생명 e암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "L01C009000009",
    officialProductUrl:
      "https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer",
    saleStatus: "unknown",
    saleStatusEvidence: "공식 상품 페이지 접근은 확인했으나 판매상태는 수동 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: null,
    premiumText: "0원",
    premiumBasis: "보험다모아 수집값이 0원이라 대표 월 보험료로 사용할 수 없다. 실제 보험료 산정 조건을 재조회해야 한다.",
    renewalType: "non_renewable",
    coverageSummary: "공식 문서 hash가 확보된 인터넷 암보험 후보. 암 급부 차이와 보장 caveat 승인 전까지 추천 상품으로 노출하지 않는다.",
    exclusionsSummary: "암 급부별 면책, 감액, 보장 제외 조건은 약관 파싱과 수동 검수 후 확정한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "oncology",
      matching_strategy: "risk_target",
      risk_targets: [
        "pancreatic_cancer",
        "liver_cancer",
        "lung_cancer",
        "breast_cancer",
        "colon_cancer",
      ],
    }),
    coverageCaveatsJson: JSON.stringify([
      "보험료 0원 값은 대표 보험료로 사용할 수 없음",
      "암 급부별 보장 차이와 caveat 수동 승인 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_shinhan_life_sol_cancer_202601",
    carrierId: "carrier_shinhan_life",
    rawProductName: "신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형)",
    normalizedProductName: "신한SOL암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "L11C009000006",
    officialProductUrl: "https://s.shinhanlife.co.kr/sht/6Nf1STxRv62YxH2X1wZxjQYN2qx3K.cs",
    saleStatus: "unknown",
    saleStatusEvidence: "공식 문서 hash는 확보했으나 판매상태와 seed 노출은 수동 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 6750,
    premiumText: "6,750원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "non_renewable",
    coverageSummary: "공식 문서 hash가 확보된 비갱신형 인터넷 암보험 후보. 암 급부 차이와 90일 면책 caveat를 승인해야 한다.",
    exclusionsSummary: "암 보장 개시일, 감액기간, 특정 암 급부 차이를 약관 기준으로 별도 검수한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "oncology",
      matching_strategy: "risk_target",
      risk_targets: [
        "pancreatic_cancer",
        "liver_cancer",
        "lung_cancer",
        "breast_cancer",
        "colon_cancer",
      ],
    }),
    coverageCaveatsJson: JSON.stringify([
      "90일 면책 및 감액기간 검수 필요",
      "유방암, 직결장암 등 암 급부 차이 표시 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_db_direct_medical_202605",
    carrierId: "carrier_db_insurance",
    rawProductName: "(무)다이렉트 실손의료비보험2605(CM)",
    normalizedProductName: "DB손보 다이렉트 실손의료비보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N11G004000001G",
    officialProductUrl:
      "https://m.directdb.co.kr/ltm/prd/pmimdcs/custInfoView.do?searchPdcCd=31020&searchPdcTrtHistCd=00&pdcDvcd=l_pmi",
    saleStatus: "unknown",
    saleStatusEvidence: "보험사 공시 문서 hash는 확보했으나 서비스 노출은 baseline 위치 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 6219,
    premiumText: "6,219원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "unknown",
    coverageSummary: "질병과 상해 치료비를 폭넓게 보상하는 실손의료보험 baseline 후보.",
    exclusionsSummary: "자기부담금, 비급여, 갱신 조건은 약관 파싱 후 표시한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "medical_expense",
      matching_strategy: "baseline",
      risk_targets: [],
    }),
    coverageCaveatsJson: JSON.stringify([
      "유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시해야 함",
      "자기부담금 및 비급여 보장 조건 검수 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_kb_direct_medical_202605",
    carrierId: "carrier_kb_insurance",
    rawProductName: "KB손보 다이렉트실손의료비보장보험(무배당)(26.05)",
    normalizedProductName: "KB손보 다이렉트실손의료비보장보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N10G004000002G",
    officialProductUrl: "https://m.kbinsure.co.kr:8547/dctapp/main.html#/GLM/RD/LT_CM0101M",
    saleStatus: "unknown",
    saleStatusEvidence: "고정 PDF URL hash는 확보했으나 URL 신선도와 baseline 노출은 수동 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 6400,
    premiumText: "6,400원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "unknown",
    coverageSummary: "공식 약관 hash가 확보된 실손의료보험 baseline 후보.",
    exclusionsSummary: "자기부담금, 비급여, 갱신 조건은 약관 파싱 후 표시한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "medical_expense",
      matching_strategy: "baseline",
      risk_targets: [],
    }),
    coverageCaveatsJson: JSON.stringify([
      "유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시해야 함",
      "고정 PDF URL 신선도 확인 절차 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_samsung_fire_direct_medical_202605",
    carrierId: "carrier_samsung_fire",
    rawProductName: "무배당 삼성화재 다이렉트 실손의료비보험(2605.1)",
    normalizedProductName: "삼성화재 다이렉트 실손의료비보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N08G004000002G",
    officialProductUrl: "http://direct.samsungfire.com/CR_MyAnycarWeb/overture_index.jsp?OTK=Q1510OB0001",
    saleStatus: "unknown",
    saleStatusEvidence: "약관 PDF hash는 확보했으나 판매상태와 보험료 기준은 수동 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 6575,
    premiumText: "6,575원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "unknown",
    coverageSummary: "공식 약관 hash가 확보된 실손의료보험 baseline 후보.",
    exclusionsSummary: "자기부담금, 비급여, 갱신 조건은 약관 파싱 후 표시한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "medical_expense",
      matching_strategy: "baseline",
      risk_targets: [],
    }),
    coverageCaveatsJson: JSON.stringify([
      "유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시해야 함",
      "판매상태와 보험료 기준 수동 승인 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_hyundai_direct_medical_202605",
    carrierId: "carrier_hyundai_marine",
    rawProductName: "(무)현대해상다이렉트실손의료비보장보험(갱신형)(Hi2605)",
    normalizedProductName: "현대해상다이렉트실손의료비보장보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N09G004000001G",
    officialProductUrl:
      "https://mdirect.hi.co.kr/service.do?m=16baef8710&simpCalc=Y&embrYn=Y&utm_source=damoa&utm_medium=partner&utm_campaign=medical_mo&HDMS1=partner&HDMS2=damoa&HDMS3=damoa&HDMS4=medical_mo&inpath=e_sure_market",
    saleStatus: "unknown",
    saleStatusEvidence: "약관 PDF hash는 확보했으나 갱신형 caveat와 보험료 기준은 수동 승인 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 6740,
    premiumText: "6,740원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "renewable",
    coverageSummary: "공식 약관 hash가 확보된 갱신형 실손의료보험 baseline 후보.",
    exclusionsSummary: "갱신, 재가입, 자기부담금, 비급여 조건은 약관 파싱 후 표시한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "medical_expense",
      matching_strategy: "baseline",
      risk_targets: [],
    }),
    coverageCaveatsJson: JSON.stringify([
      "유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시해야 함",
      "갱신형 보험료 변동 및 재가입 caveat 표시 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "src_samsung_life_hospital_health_202601",
    carrierId: "carrier_samsung_life",
    rawProductName: "삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형)",
    normalizedProductName: "삼성 인터넷 입원 건강보험",
    productGroup: "입원 건강보험",
    eInsmarketProductCode: "L03C001000015",
    officialProductUrl: "https://direct.samsunglife.com/damoa.eds?cid=di:insmarket:damoa:insmarket:240513",
    saleStatus: "unknown",
    saleStatusEvidence: "통합약관 hash는 확보했으나 현재 coverage_category enum에 맞지 않아 source catalog 전용 후보로 둔다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: 8650,
    premiumText: "8,650원",
    premiumBasis: COMMON_PREMIUM_BASIS,
    renewalType: "unknown",
    coverageSummary: "입원 건강보험 후보. hospitalization 또는 general_health 카테고리 결정 전까지 추천 상품으로 노출하지 않는다.",
    exclusionsSummary: "입원 급부와 보장 제외 조건은 카테고리 확정 후 약관 기준으로 검수한다.",
    coverageDetailsJson: JSON.stringify({
      coverage_category: "hospitalization_general_health_required",
      matching_strategy: "baseline_or_manual",
      risk_targets: [],
    }),
    coverageCaveatsJson: JSON.stringify([
      "현재 insurance_products coverage_category enum에 맞지 않음",
      "hospitalization 또는 general_health 카테고리 정책 결정 필요",
    ]),
    reviewStatus: "needs_review",
    reviewedAt,
    lastVerifiedAt: reviewedAt,
    createdAt: now,
    updatedAt: now,
  },
];

const SOURCE_AWARE_DOCUMENTS: InsuranceSourceDocumentSeed[] = [
  {
    id: "doc_hanwha_life_e_cancer_summary_202604",
    productSourceId: "src_hanwha_life_e_cancer_202604",
    carrierId: "carrier_hanwha_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://direct.hanwhalife.com/products/downloadProxy/%ED%95%9C%ED%99%94%EC%83%9D%EB%AA%85%20e%EC%95%94%EB%B3%B4%ED%97%98(%EB%B9%84%EA%B0%B1%EC%8B%A0%ED%98%95)%20%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260417.pdf?docUrl=dynamic/direct/product/cms_edaqInsr09Jt0RKh_1776383454363.pdf",
    fileHashSha256: "acea8fcef33624a66dd898a729e283004f2a520f8a77daa55db9a3a22bed4d3f",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_hanwha_life_e_cancer_terms_202604",
    productSourceId: "src_hanwha_life_e_cancer_202604",
    carrierId: "carrier_hanwha_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://direct.hanwhalife.com/products/downloadProxy/%ED%95%9C%ED%99%94%EC%83%9D%EB%AA%85%20e%EC%95%94%EB%B3%B4%ED%97%98(%EB%B9%84%EA%B0%B1%EC%8B%A0%ED%98%95)%20%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260417.pdf?docUrl=dynamic/direct/product/cms_T3jquWCZurf6YKm6_1776383470397.pdf",
    fileHashSha256: "918796d28b8274195258621c08c32c87159c18b1a50fb6e6f653a8c42ba8f7ed",
    contentType: "application/pdf",
    contentLengthBytes: 3661413,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_shinhan_life_sol_cancer_summary_202601",
    productSourceId: "src_shinhan_life_sol_cancer_202601",
    carrierId: "carrier_shinhan_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__media/%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9_%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf",
    fileHashSha256: "d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_shinhan_life_sol_cancer_business_202601",
    productSourceId: "src_shinhan_life_sol_cancer_202601",
    carrierId: "carrier_shinhan_life",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__etc/%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%20%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf",
    fileHashSha256: "9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_shinhan_life_sol_cancer_terms_202601",
    productSourceId: "src_shinhan_life_sol_cancer_202601",
    carrierId: "carrier_shinhan_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://shinhanlife.co.kr/bizxpress/cdh/cdhi/gd/pr/__etc/%ED%8C%90%EB%A7%A4%EC%95%BD%EA%B4%80_%EC%8B%A0%ED%95%9CSOL%EC%95%94%EB%B3%B4%ED%97%98(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%20%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%20%EB%AF%B8%EC%A7%80%EA%B8%89%ED%98%95)_260101.pdf",
    fileHashSha256: "fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_db_direct_medical_terms_202605",
    productSourceId: "src_db_direct_medical_202605",
    carrierId: "carrier_db_insurance",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%95%BD%EA%B4%80_31227(00)_20260506.pdf",
    fileHashSha256: "db24ea2e2dbf2f4200d0aabe86d92a26e0b3d4962e521f99a6ee35f901997074",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_db_direct_medical_business_202605",
    productSourceId: "src_db_direct_medical_202605",
    carrierId: "carrier_db_insurance",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl: "https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%82%AC%EB%B0%A9_31227(00)_20260506.pdf",
    fileHashSha256: "3a7a855b44c2d58eb0845cb4031ce8e71e62241fbe3987a9c3895e5ecfb27019",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_db_direct_medical_summary_202605",
    productSourceId: "src_db_direct_medical_202605",
    carrierId: "carrier_db_insurance",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl: "https://www.idbins.com/cYakgwanDown.do?FilePath=InsProduct/%EC%9A%94%EC%95%BD_31227(00)_20260506.pdf",
    fileHashSha256: "334fd0bd1c7d49e1729b8584eefbb7bd02cdb5112de6e8371357be09befc77ac",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kb_direct_medical_terms_202605",
    productSourceId: "src_kb_direct_medical_202605",
    carrierId: "carrier_kb_insurance",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://m.kbinsure.co.kr:8547/dctapp/views/terms/KB_Direct_Medical(25192)_202605.pdf",
    fileHashSha256: "4c5927fb929cae39c4f5a4957945a75e208769a6d7c46d7e892c2942ffe8e98a",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_samsung_fire_direct_medical_terms_202605",
    productSourceId: "src_samsung_fire_direct_medical_202605",
    carrierId: "carrier_samsung_fire",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://direct.samsungfire.com/docs/realloss.pdf",
    fileHashSha256: "db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_hyundai_direct_medical_terms_202605",
    productSourceId: "src_hyundai_direct_medical_202605",
    carrierId: "carrier_hyundai_marine",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://mdirect.hi.co.kr/dhNAS/terms/CM12M2_20260506.pdf",
    fileHashSha256: "af92c7ee0f31d3aaf8eb4f05f9918b81795405bb51dbeb5346dbff910aea5f4a",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_samsung_life_hospital_health_terms_202601",
    productSourceId: "src_samsung_life_hospital_health_202601",
    carrierId: "carrier_samsung_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://direct.samsunglife.com/contents/policy_was/%EA%B8%B0%ED%83%80_%EC%82%BC%EC%84%B1%20%EC%9D%B8%ED%84%B0%EB%84%B7%20%EC%9E%85%EC%9B%90%20%EA%B1%B4%EA%B0%95%EB%B3%B4%ED%97%98(2601)(%EB%AC%B4%EB%B0%B0%EB%8B%B9,%EB%AC%B4%ED%95%B4%EC%95%BD%ED%99%98%EA%B8%89%EA%B8%88%ED%98%95)_%ED%86%B5%ED%95%A9%EC%95%BD%EA%B4%80_20260101.pdf",
    fileHashSha256: "ce40ecf0629246dd761d63c9badbc04d32e74839fce8a4d74176277b8e5d1363",
    contentType: "application/pdf",
    contentLengthBytes: null,
    retrievedAt: reviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
];

const DEMO_PRODUCTS: InsuranceProductSeed[] = [
  {
    id: "prod_001",
    name: "췌장·간 집중 보장 특약",
    provider: "KB손해보험",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 32.0,
    originalPremiumUsdc: 45.0,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(["pancreatic_cancer", "liver_cancer"]),
    matchingStrategy: "risk_target",
    catalogStatus: "approved",
    discountEligible: 1,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_002",
    name: "암 진단비 강화 특약",
    provider: "삼성생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 47.0,
    originalPremiumUsdc: 60.0,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(["pancreatic_cancer", "lung_cancer", "colon_cancer"]),
    matchingStrategy: "risk_target",
    catalogStatus: "approved",
    discountEligible: 1,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_003",
    name: "당뇨·대사 관리 특약",
    provider: "한화생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 18.5,
    originalPremiumUsdc: null,
    coverageCategory: "metabolic" as const,
    riskTargets: JSON.stringify(["type2_diabetes", "hyperlipidemia"]),
    matchingStrategy: "risk_target",
    catalogStatus: "approved",
    discountEligible: 0,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_004",
    name: "심혈관 정밀 보장 특약",
    provider: "신한라이프",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 29.0,
    originalPremiumUsdc: 38.0,
    coverageCategory: "cardiovascular" as const,
    riskTargets: JSON.stringify(["myocardial_infarction", "stroke", "arrhythmia"]),
    matchingStrategy: "risk_target",
    catalogStatus: "approved",
    discountEligible: 1,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_005",
    name: "치매 조기 진단 특약",
    provider: "교보생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 22.0,
    originalPremiumUsdc: null,
    coverageCategory: "neurological" as const,
    riskTargets: JSON.stringify(["alzheimers", "parkinsons"]),
    matchingStrategy: "risk_target",
    catalogStatus: "approved",
    discountEligible: 0,
    isActive: 1,
    createdAt: now,
  },
];

function assertValidSourceDocumentHashes(documents: InsuranceSourceDocumentSeed[]) {
  for (const document of documents) {
    if (!SHA256_HEX_PATTERN.test(document.fileHashSha256)) {
      throw new Error(
        `Invalid SHA-256 hash for source document ${document.id}: ${document.fileHashSha256}`
      );
    }
  }
}

async function seed() {
  assertValidSourceDocumentHashes(SOURCE_AWARE_DOCUMENTS);

  console.log("Seeding insurance carriers...");
  for (const carrier of SOURCE_AWARE_CARRIERS) {
    await db
      .insert(insuranceCarriers)
      .values(carrier)
      .onConflictDoNothing();
  }

  console.log("Seeding source-aware insurance product candidates...");
  for (const productSource of SOURCE_AWARE_PRODUCT_SOURCES) {
    await db
      .insert(insuranceProductSources)
      .values(productSource)
      .onConflictDoNothing();
  }

  console.log("Seeding source-aware insurance documents...");
  for (const document of SOURCE_AWARE_DOCUMENTS) {
    await db
      .insert(insuranceSourceDocuments)
      .values(document)
      .onConflictDoNothing();
  }

  console.log("Seeding active demo insurance products...");
  for (const product of DEMO_PRODUCTS) {
    await db
      .insert(insuranceProducts)
      .values(product)
      .onConflictDoNothing();
  }
  console.log(
    "Seed complete. 7 carriers, 7 source candidates, 12 documents, and 5 active demo products checked."
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
