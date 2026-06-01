import "dotenv/config";
import { createClient } from "@libsql/client";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { DateTime } from "luxon";
import {
  insuranceCarriers,
  insurancePremiumQuotes,
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
const quoteOnlyVariantReviewedAt = DateTime.fromISO("2026-05-29T02:58:00+09:00").toJSDate();
const kdbShinhanVariantReviewedAt = DateTime.fromISO("2026-05-29T23:11:00+09:00").toJSDate();
const firstRecommendationSnapshotReviewedAt = DateTime.fromISO("2026-05-30T16:30:00+09:00").toJSDate();
const hanwhaLifeQuoteReviewedAt = DateTime.fromISO("2026-05-31T00:49:37.412+09:00").toJSDate();
const medicalBaselineSnapshotReviewedAt = DateTime.fromISO("2026-05-31T02:49:00+09:00").toJSDate();
const samsungFireMedicalSnapshotReviewedAt = DateTime.fromISO("2026-05-31T16:42:00+09:00").toJSDate();
const shinhanNoRefundSnapshotReviewedAt = DateTime.fromISO("2026-05-31T18:09:00+09:00").toJSDate();
const nhFireMedicalSnapshotReviewedAt = DateTime.fromISO("2026-05-31T19:49:00+09:00").toJSDate();
const meritzFireMedicalSnapshotReviewedAt = DateTime.fromISO("2026-05-31T21:39:00+09:00").toJSDate();
const heungkukFireMedicalSnapshotReviewedAt = DateTime.fromISO("2026-05-31T22:34:00+09:00").toJSDate();
const miraeassetLifeCancerSnapshotReviewedAt = DateTime.fromISO("2026-06-01T00:48:00+09:00").toJSDate();
const hanwhaGeneralCancerSnapshotReviewedAt = DateTime.fromISO("2026-06-01T02:27:00+09:00").toJSDate();
const dbLifeCancerSnapshotReviewedAt = DateTime.fromISO("2026-06-01T03:34:00+09:00").toJSDate();
const lotteMedicalSnapshotReviewedAt = DateTime.fromISO("2026-06-01T04:30:00+09:00").toJSDate();
const tongyangLifeCancerSnapshotReviewedAt = DateTime.fromISO("2026-06-01T13:20:00+09:00").toJSDate();
const samsungLifeHospitalPolicyReviewedAt = DateTime.fromISO("2026-06-01T15:05:00+09:00").toJSDate();
const hanwhaGeneralMedicalBlockerReviewedAt = DateTime.fromISO("2026-06-01T15:40:00+09:00").toJSDate();
const shinhanStandardBlockerReviewedAt = DateTime.fromISO("2026-06-01T19:25:00+09:00").toJSDate();

type InsuranceCarrierSeed = typeof insuranceCarriers.$inferInsert;
type InsuranceProductSourceSeed = typeof insuranceProductSources.$inferInsert;
type InsuranceSourceDocumentSeed = typeof insuranceSourceDocuments.$inferInsert;
type InsurancePremiumQuoteSeed = typeof insurancePremiumQuotes.$inferInsert;
type InsuranceProductSeed = typeof insuranceProducts.$inferInsert;

type InsuranceProductSourceApproval = {
  id: string;
  values: Partial<InsuranceProductSourceSeed>;
};

const COMMON_PREMIUM_BASIS =
  "보험다모아 비교 조건 기준 월 보험료입니다. 실제 보험료는 나이, 성별, 가입금액, 납입기간, 갱신 여부, 특약, 인수심사 결과에 따라 달라질 수 있습니다.";

const QUOTE_ONLY_PREMIUM_BASIS =
  "보험다모아 조건별 quote matrix에서 확인한 상품입니다. source row 대표 보험료는 고정하지 않고, 나이/성별별 보험료는 insurance_premium_quotes에서 별도 관리합니다.";

const quoteExpansionCheckedAt = DateTime.fromISO("2026-05-29T00:45:00+09:00").toJSDate();
const FIRST_SNAPSHOT_KRW_PER_USDC = 1350;
const FIRST_SNAPSHOT_PREMIUM_BASIS =
  "보험다모아 암보험 모바일 조회 조건(age=34, sex=2, enterType=A, indemnityTypeA=1, renewTypeA=C1) 기준 월 보험료입니다. USDC 금액은 2026-05-30 첫 추천 snapshot PR에서 승인한 고정 데모 환산율 1 USDC = 1,350 KRW로 계산했으며 실시간 환율이 아닙니다.";

const HANWHA_LIFE_CARRIER_QUOTE_PREMIUM_BASIS =
  "한화생명 공식 다이렉트 상품 페이지 CMS00012와 계산 API 기준 월 보험료입니다. 조회 기준은 2026-05-31, 상품 버전 55, 상품 기준일 20260529, 100세 만기, 20년납, 월납, 주계약가입금액 1,000만원입니다. USDC 금액은 고정 데모 환산율 1 USDC = 1,350 KRW로 계산했으며 실시간 환율이 아닙니다.";

const HANWHA_LIFE_QUOTE_SOURCE_URL =
  "https://api.hanwhalife.com/product/calculate/v3/default";

const MEDICAL_BASELINE_PREMIUM_BASIS =
  "보험다모아 실손의료보험 모바일 공개 비교 조건 기준 월 보험료입니다. 대표 보험료는 age34_female 조건이며, 조건별 보험료는 insurance_premium_quotes의 approved quote matrix에서 별도 표시합니다. USDC 금액은 고정 데모 환산율 1 USDC = 1,350 KRW로 계산했으며 실시간 환율이 아닙니다.";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

const ONCOLOGY_RISK_TARGETS = [
  "pancreatic_cancer",
  "liver_cancer",
  "lung_cancer",
  "breast_cancer",
  "colon_cancer",
];

const FIRST_SNAPSHOT_APPROVED_QUOTE_IDS = [
  "quote_src_kdb_life_direct_cancer_202605_age34_male_d2e77ecf4a0c",
  "quote_src_kdb_life_direct_cancer_202605_age34_female_1015b0165c0e",
  "quote_src_kdb_life_direct_cancer_202605_age44_male_99a3f15d59fc",
  "quote_src_kdb_life_direct_cancer_202605_age44_female_9cf2588db68b",
  "quote_src_kyobo_lifeplanet_cancer_nonsmoker_202605_age34_male_d2e77ecf4a0c",
  "quote_src_kyobo_lifeplanet_cancer_nonsmoker_202605_age34_female_1015b0165c0e",
  "quote_src_kyobo_lifeplanet_cancer_nonsmoker_202605_age44_male_99a3f15d59fc",
  "quote_src_kyobo_lifeplanet_cancer_nonsmoker_202605_age44_female_9cf2588db68b",
  "quote_src_kyobo_lifeplanet_cancer_standard_202605_age34_male_d2e77ecf4a0c",
  "quote_src_kyobo_lifeplanet_cancer_standard_202605_age34_female_1015b0165c0e",
  "quote_src_kyobo_lifeplanet_cancer_standard_202605_age44_male_99a3f15d59fc",
  "quote_src_kyobo_lifeplanet_cancer_standard_202605_age44_female_9cf2588db68b",
];

const HANWHA_LIFE_ZERO_QUOTE_REJECTED_IDS = [
  "quote_src_hanwha_life_e_cancer_202604_age34_female_2589f537c6fc",
  "quote_src_hanwha_life_e_cancer_202604_age34_male_0d807392cd7d",
  "quote_src_hanwha_life_e_cancer_202604_age44_female_88d1cf1a2fad",
  "quote_src_hanwha_life_e_cancer_202604_age44_male_dbd72b264aa2",
  "quote_src_hanwha_life_e_cancer_nonsmoker_202604_age34_male_d2e77ecf4a0c",
  "quote_src_hanwha_life_e_cancer_nonsmoker_202604_age34_female_1015b0165c0e",
  "quote_src_hanwha_life_e_cancer_nonsmoker_202604_age44_male_99a3f15d59fc",
  "quote_src_hanwha_life_e_cancer_nonsmoker_202604_age44_female_9cf2588db68b",
];

const SOURCE_CATALOG_EXCLUSION_QUOTE_REJECTED_IDS = [
  "quote_src_hanwha_general_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_hanwha_general_direct_medical_202605_age34_male_60456bed3452",
  "quote_src_hanwha_general_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_hanwha_general_direct_medical_202605_age44_male_26615bdcb076",
  "quote_src_shinhan_life_sol_cancer_standard_202605_age34_female_1015b0165c0e",
  "quote_src_shinhan_life_sol_cancer_standard_202605_age34_male_d2e77ecf4a0c",
  "quote_src_shinhan_life_sol_cancer_standard_202605_age44_female_9cf2588db68b",
  "quote_src_shinhan_life_sol_cancer_standard_202605_age44_male_99a3f15d59fc",
];

const MEDICAL_BASELINE_APPROVED_QUOTE_IDS = [
  "quote_src_db_direct_medical_202605_age34_male_f20570f4817b",
  "quote_src_db_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_db_direct_medical_202605_age44_male_2a491b5a1fab",
  "quote_src_db_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_kb_direct_medical_202605_age34_male_f20570f4817b",
  "quote_src_kb_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_kb_direct_medical_202605_age44_male_2a491b5a1fab",
  "quote_src_kb_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_samsung_fire_direct_medical_202605_age34_male_f20570f4817b",
  "quote_src_samsung_fire_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_samsung_fire_direct_medical_202605_age44_male_2a491b5a1fab",
  "quote_src_samsung_fire_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_hyundai_direct_medical_202605_age34_male_f20570f4817b",
  "quote_src_hyundai_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_hyundai_direct_medical_202605_age44_male_2a491b5a1fab",
  "quote_src_hyundai_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_nh_fire_medical_202605_age34_male_60456bed3452",
  "quote_src_nh_fire_medical_202605_age34_female_b141dc7c5700",
  "quote_src_nh_fire_medical_202605_age44_male_26615bdcb076",
  "quote_src_nh_fire_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_meritz_direct_medical_202605_age34_male_60456bed3452",
  "quote_src_meritz_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_meritz_direct_medical_202605_age44_male_26615bdcb076",
  "quote_src_meritz_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_heungkuk_fire_direct_medical_202605_age34_male_60456bed3452",
  "quote_src_heungkuk_fire_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_heungkuk_fire_direct_medical_202605_age44_male_26615bdcb076",
  "quote_src_heungkuk_fire_direct_medical_202605_age44_female_58dcc145a6b7",
  "quote_src_lotte_direct_medical_202605_age34_male_60456bed3452",
  "quote_src_lotte_direct_medical_202605_age34_female_b141dc7c5700",
  "quote_src_lotte_direct_medical_202605_age44_male_26615bdcb076",
  "quote_src_lotte_direct_medical_202605_age44_female_58dcc145a6b7",
];

const SHINHAN_NO_REFUND_APPROVED_QUOTE_IDS = [
  "quote_src_shinhan_life_sol_cancer_202601_age34_female_2589f537c6fc",
  "quote_src_shinhan_life_sol_cancer_202601_age34_male_0d807392cd7d",
  "quote_src_shinhan_life_sol_cancer_202601_age44_female_88d1cf1a2fad",
  "quote_src_shinhan_life_sol_cancer_202601_age44_male_dbd72b264aa2",
];

const MIRAEASSET_LIFE_CANCER_APPROVED_QUOTE_IDS = [
  "quote_src_miraeasset_online_cancer_basic_202605_age34_female_1015b0165c0e",
  "quote_src_miraeasset_online_cancer_basic_202605_age34_male_d2e77ecf4a0c",
  "quote_src_miraeasset_online_cancer_basic_202605_age44_female_9cf2588db68b",
  "quote_src_miraeasset_online_cancer_basic_202605_age44_male_99a3f15d59fc",
  "quote_src_miraeasset_online_cancer_no_refund_202605_age34_female_1015b0165c0e",
  "quote_src_miraeasset_online_cancer_no_refund_202605_age34_male_d2e77ecf4a0c",
  "quote_src_miraeasset_online_cancer_no_refund_202605_age44_female_9cf2588db68b",
  "quote_src_miraeasset_online_cancer_no_refund_202605_age44_male_99a3f15d59fc",
];

const HANWHA_GENERAL_CANCER_APPROVED_QUOTE_IDS = [
  "quote_src_hanwha_general_direct_cancer_202604_age34_female_1015b0165c0e",
  "quote_src_hanwha_general_direct_cancer_202604_age34_male_d2e77ecf4a0c",
  "quote_src_hanwha_general_direct_cancer_202604_age44_female_9cf2588db68b",
  "quote_src_hanwha_general_direct_cancer_202604_age44_male_99a3f15d59fc",
];

const DB_LIFE_CANCER_APPROVED_QUOTE_IDS = [
  "quote_src_db_life_eroun_cancer_202601_age34_female_1015b0165c0e",
  "quote_src_db_life_eroun_cancer_202601_age34_male_d2e77ecf4a0c",
  "quote_src_db_life_eroun_cancer_202601_age44_female_9cf2588db68b",
  "quote_src_db_life_eroun_cancer_202601_age44_male_99a3f15d59fc",
];

const TONGYANG_LIFE_CANCER_APPROVED_QUOTE_IDS = [
  "quote_src_tongyang_wooriwon_cancer_202605_age34_female_1015b0165c0e",
  "quote_src_tongyang_wooriwon_cancer_202605_age34_male_d2e77ecf4a0c",
  "quote_src_tongyang_wooriwon_cancer_202605_age44_female_9cf2588db68b",
  "quote_src_tongyang_wooriwon_cancer_202605_age44_male_99a3f15d59fc",
];

function toFirstSnapshotUsdc(monthlyPremiumKrw: number) {
  return Number((monthlyPremiumKrw / FIRST_SNAPSHOT_KRW_PER_USDC).toFixed(2));
}

type QuoteOnlyProductSourceInput = {
  id: string;
  carrierId: string;
  rawProductName: string;
  normalizedProductName: string;
  productGroup: "암보험" | "실손의료보험";
  eInsmarketProductCode: string;
  renewalType: string;
};

function buildQuoteOnlyProductSource(input: QuoteOnlyProductSourceInput): InsuranceProductSourceSeed {
  const isMedical = input.productGroup === "실손의료보험";

  return {
    id: input.id,
    carrierId: input.carrierId,
    rawProductName: input.rawProductName,
    normalizedProductName: input.normalizedProductName,
    productGroup: input.productGroup,
    eInsmarketProductCode: input.eInsmarketProductCode,
    officialProductUrl: null,
    saleStatus: "unknown",
    saleStatusEvidence:
      "보험다모아 quote matrix에서 상품명, 보험사, e-insmarket product code, 조건별 보험료를 확인했다. 보험사 공시 문서 hash와 판매상태는 후속 매칭 키워드 정리 전이다.",
    premiumCurrency: "KRW",
    monthlyPremiumKrw: null,
    premiumText: null,
    premiumBasis: QUOTE_ONLY_PREMIUM_BASIS,
    renewalType: input.renewalType,
    coverageSummary: isMedical
      ? "보험다모아 quote matrix에서 확인한 실손의료보험 원천 후보. 공식 문서 hash와 baseline caveat 정리 전까지 추천 상품으로 노출하지 않는다."
      : "보험다모아 quote matrix에서 확인한 암보험 원천 후보. 공식 문서 hash와 암 급부 caveat 정리 전까지 추천 상품으로 노출하지 않는다.",
    exclusionsSummary: isMedical
      ? "자기부담금, 비급여, 갱신 조건은 약관 hash 확보와 매칭 키워드 정리 후 확정한다."
      : "암 보장 개시일, 면책, 감액, 특정암 급부 차이는 약관 hash 확보와 매칭 키워드 정리 후 확정한다.",
    coverageDetailsJson: JSON.stringify(
      isMedical
        ? {
            coverage_category: "medical_expense",
            matching_strategy: "baseline",
            risk_targets: [],
            review_basis: "e_insmarket_quote_only",
          }
        : {
            coverage_category: "oncology",
            matching_strategy: "risk_target",
            risk_targets: ONCOLOGY_RISK_TARGETS,
            review_basis: "e_insmarket_quote_only",
          }
    ),
    coverageCaveatsJson: JSON.stringify(
      isMedical
        ? [
            "보험다모아 quote-only 원천 후보",
            "유전자 위험 특화 추천이 아니라 기본 의료비 방어 baseline으로만 검토",
            "공식 약관 hash와 자기부담금/비급여 caveat 정리 필요",
          ]
        : [
            "보험다모아 quote-only 원천 후보",
            "공식 약관 hash와 암 급부 caveat 정리 필요",
            "매칭 키워드 정리 전 추천 snapshot 발행 금지",
          ]
    ),
    reviewStatus: "raw",
    reviewedAt: null,
    lastVerifiedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  };
}

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
  {
    id: "carrier_nh_fire",
    nameKo: "농협손보",
    nameEn: "NH Property & Casualty Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_lotte_insurance",
    nameKo: "롯데손보",
    nameEn: "Lotte Non-Life Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_meritz_fire",
    nameKo: "메리츠화재",
    nameEn: "Meritz Fire & Marine Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_hanwha_general",
    nameKo: "한화손보",
    nameEn: "Hanwha General Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_heungkuk_fire",
    nameKo: "흥국화재",
    nameEn: "Heungkuk Fire & Marine Insurance",
    carrierType: "general",
    associationSource: "knia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_kyobo_lifeplanet",
    nameKo: "교보라이프플래닛",
    nameEn: "Kyobo Lifeplanet Life Insurance",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_tongyang_life",
    nameKo: "동양생명",
    nameEn: "Tongyang Life Insurance",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_miraeasset_life",
    nameKo: "미래에셋생명",
    nameEn: "Mirae Asset Life Insurance",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_db_life",
    nameKo: "DB생명",
    nameEn: "DB Life Insurance",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "carrier_kdb_life",
    nameKo: "KDB생명",
    nameEn: "KDB Life Insurance",
    carrierType: "life",
    associationSource: "klia",
    homepageUrl: null,
    disclosureUrl: null,
    isActive: 1,
    lastCheckedAt: quoteExpansionCheckedAt,
    createdAt: now,
    updatedAt: now,
  },
];

const QUOTE_EXPANSION_PRODUCT_SOURCES: InsuranceProductSourceSeed[] = [
  buildQuoteOnlyProductSource({
    id: "src_nh_fire_medical_202605",
    carrierId: "carrier_nh_fire",
    rawProductName: "(무) 헤아림실손의료비보험2605",
    normalizedProductName: "농협손보 헤아림실손의료비보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N71G004000001G",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_lotte_direct_medical_202605",
    carrierId: "carrier_lotte_insurance",
    rawProductName: "무배당 let:care 실손의료보험Ⅴ(2605)",
    normalizedProductName: "롯데손보 let:care 실손의료보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N03G004000001G",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_meritz_direct_medical_202605",
    carrierId: "carrier_meritz_fire",
    rawProductName: "(무) 메리츠 다이렉트 실손의료비보험2605",
    normalizedProductName: "메리츠 다이렉트 실손의료비보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N01G004000002G",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_hanwha_general_direct_medical_202605",
    carrierId: "carrier_hanwha_general",
    rawProductName: "한화다이렉트실손의료보험(갱신형)Ⅴ 무배당",
    normalizedProductName: "한화다이렉트실손의료보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N02G004000001G",
    renewalType: "renewable",
  }),
  buildQuoteOnlyProductSource({
    id: "src_heungkuk_fire_direct_medical_202605",
    carrierId: "carrier_heungkuk_fire",
    rawProductName: "(무)흥Good 다이렉트 실손의료보험(26.05)",
    normalizedProductName: "흥국화재 흥Good 다이렉트 실손의료보험",
    productGroup: "실손의료보험",
    eInsmarketProductCode: "N05G004000001G",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    rawProductName: "(무)교보라플 비갱신암보험(해약환급금 미지급형, 비흡연체)",
    normalizedProductName: "교보라플 비갱신암보험 비흡연체",
    productGroup: "암보험",
    eInsmarketProductCode: "L43C009000022",
    renewalType: "non_renewable",
  }),
  buildQuoteOnlyProductSource({
    id: "src_kyobo_lifeplanet_cancer_standard_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    rawProductName: "(무)교보라플 비갱신암보험(해약환급금 미지급형, 표준체)",
    normalizedProductName: "교보라플 비갱신암보험 표준체",
    productGroup: "암보험",
    eInsmarketProductCode: "L43C009000019",
    renewalType: "non_renewable",
  }),
  buildQuoteOnlyProductSource({
    id: "src_tongyang_wooriwon_cancer_202605",
    carrierId: "carrier_tongyang_life",
    rawProductName: "(무)우리WON하는실속하나로암보험",
    normalizedProductName: "우리WON하는실속하나로암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "L74C009000006",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_miraeasset_online_cancer_basic_202605",
    carrierId: "carrier_miraeasset_life",
    rawProductName: "온라인 암보험 무배당 [기본형]",
    normalizedProductName: "미래에셋생명 온라인 암보험 기본형",
    productGroup: "암보험",
    eInsmarketProductCode: "L34C009000021",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_miraeasset_online_cancer_no_refund_202605",
    carrierId: "carrier_miraeasset_life",
    rawProductName: "온라인 암보험 무배당 [해약환급금이없는유형]",
    normalizedProductName: "미래에셋생명 온라인 암보험 해약환급금이없는유형",
    productGroup: "암보험",
    eInsmarketProductCode: "L34C009000022",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_shinhan_life_sol_cancer_standard_202605",
    carrierId: "carrier_shinhan_life",
    rawProductName: "신한SOL암보험(무배당)(비갱신형)",
    normalizedProductName: "신한SOL암보험 비갱신형",
    productGroup: "암보험",
    eInsmarketProductCode: "L11C009000007",
    renewalType: "non_renewable",
  }),
  buildQuoteOnlyProductSource({
    id: "src_hanwha_life_e_cancer_nonsmoker_202604",
    carrierId: "carrier_hanwha_life",
    rawProductName: "한화생명 e암보험(비갱신형)(무)(비흡연체형)",
    normalizedProductName: "한화생명 e암보험 비흡연체형",
    productGroup: "암보험",
    eInsmarketProductCode: "L01C009000010",
    renewalType: "non_renewable",
  }),
  buildQuoteOnlyProductSource({
    id: "src_hanwha_general_direct_cancer_202604",
    carrierId: "carrier_hanwha_general",
    rawProductName: "한화 다이렉트 내가고른 암보험 무배당2604",
    normalizedProductName: "한화 다이렉트 내가고른 암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "N02C009000016",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_db_life_eroun_cancer_202601",
    carrierId: "carrier_db_life",
    rawProductName: "(무)e로운 암보험(해약환급금 미지급형)(2601)",
    normalizedProductName: "DB생명 e로운 암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "L71C009000006",
    renewalType: "unknown",
  }),
  buildQuoteOnlyProductSource({
    id: "src_kdb_life_direct_cancer_202605",
    carrierId: "carrier_kdb_life",
    rawProductName: "KDB다이렉트 암보험(해약환급금 미지급형III)(무)",
    normalizedProductName: "KDB다이렉트 암보험",
    productGroup: "암보험",
    eInsmarketProductCode: "L33C009000025",
    renewalType: "unknown",
  }),
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
  ...QUOTE_EXPANSION_PRODUCT_SOURCES,
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
    id: "doc_hanwha_life_e_cancer_nonsmoker_summary_202604",
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    carrierId: "carrier_hanwha_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://direct.hanwhalife.com/products/downloadProxy/%ED%95%9C%ED%99%94%EC%83%9D%EB%AA%85%20e%EC%95%94%EB%B3%B4%ED%97%98(%EB%B9%84%EA%B0%B1%EC%8B%A0%ED%98%95)%20%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260417.pdf?docUrl=dynamic/direct/product/cms_edaqInsr09Jt0RKh_1776383454363.pdf",
    fileHashSha256: "acea8fcef33624a66dd898a729e283004f2a520f8a77daa55db9a3a22bed4d3f",
    contentType: "application/pdf",
    contentLengthBytes: 4501796,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_hanwha_life_e_cancer_nonsmoker_terms_202604",
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    carrierId: "carrier_hanwha_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://direct.hanwhalife.com/products/downloadProxy/%ED%95%9C%ED%99%94%EC%83%9D%EB%AA%85%20e%EC%95%94%EB%B3%B4%ED%97%98(%EB%B9%84%EA%B0%B1%EC%8B%A0%ED%98%95)%20%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260417.pdf?docUrl=dynamic/direct/product/cms_T3jquWCZurf6YKm6_1776383470397.pdf",
    fileHashSha256: "918796d28b8274195258621c08c32c87159c18b1a50fb6e6f653a8c42ba8f7ed",
    contentType: "application/pdf",
    contentLengthBytes: 3661413,
    retrievedAt: quoteOnlyVariantReviewedAt,
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
    id: "doc_kyobo_lifeplanet_cancer_nonsmoker_summary_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_01.pdf&downloadPathType=1",
    fileHashSha256: "00e46751ef624c207f8a6aebee3b5768585216d8aeeecddf16b7d4c7bd947780",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 923678,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kyobo_lifeplanet_cancer_nonsmoker_business_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_02.pdf&downloadPathType=2",
    fileHashSha256: "7ab6f8dd927ef2b2ea95607f483cf8b6e34fe4a8c6d5844424515afc18c1cff2",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 203145,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kyobo_lifeplanet_cancer_nonsmoker_terms_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_03.pdf&downloadPathType=0",
    fileHashSha256: "a61c106f431fb98cf4d839694a1f02d282173b5732aefa62b08e17f47afaa30a",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 3474212,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kyobo_lifeplanet_cancer_standard_summary_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_standard_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_01.pdf&downloadPathType=1",
    fileHashSha256: "00e46751ef624c207f8a6aebee3b5768585216d8aeeecddf16b7d4c7bd947780",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 923678,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kyobo_lifeplanet_cancer_standard_business_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_standard_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_02.pdf&downloadPathType=2",
    fileHashSha256: "7ab6f8dd927ef2b2ea95607f483cf8b6e34fe4a8c6d5844424515afc18c1cff2",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 203145,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kyobo_lifeplanet_cancer_standard_terms_202604",
    productSourceId: "src_kyobo_lifeplanet_cancer_standard_202605",
    carrierId: "carrier_kyobo_lifeplanet",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://www.lifeplanet.co.kr/common/file/FileDownload.dev?fileName=20260401_10054_03.pdf&downloadPathType=0",
    fileHashSha256: "a61c106f431fb98cf4d839694a1f02d282173b5732aefa62b08e17f47afaa30a",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 3474212,
    retrievedAt: quoteOnlyVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kdb_life_direct_cancer_summary_202605",
    productSourceId: "src_kdb_life_direct_cancer_202605",
    carrierId: "carrier_kdb_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl: "https://direct.kdblife.co.kr/resources/doc/policy/40869_summary.pdf",
    fileHashSha256: "b6b3c5607f73accfd7cd28595cd466c6fecbc09c3b6e02e28867822fd51d407a",
    contentType: "application/pdf",
    contentLengthBytes: 204656,
    retrievedAt: kdbShinhanVariantReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_kdb_life_direct_cancer_terms_202605",
    productSourceId: "src_kdb_life_direct_cancer_202605",
    carrierId: "carrier_kdb_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://direct.kdblife.co.kr/resources/doc/policy/40870_policy.pdf",
    fileHashSha256: "a9f07c34b0551ba616f8098027873dcaed3367d2c035dd72403daa431cdc52b6",
    contentType: "application/pdf",
    contentLengthBytes: 6688831,
    retrievedAt: kdbShinhanVariantReviewedAt,
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
    contentLengthBytes: 2519879,
    retrievedAt: samsungFireMedicalSnapshotReviewedAt,
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
    id: "doc_nh_fire_medical_terms_202605",
    productSourceId: "src_nh_fire_medical_202605",
    carrierId: "carrier_nh_fire",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://www.nhfire.co.kr/imageView/downloadFile.ajax?fileId=F004074317&afileSeqn=1",
    fileHashSha256: "0306fb42f84fa976ff9680aadf6a1b348e87d5c99cd503e85b1e82b9bf728048",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 3065859,
    retrievedAt: nhFireMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_meritz_direct_medical_terms_202605",
    productSourceId: "src_meritz_direct_medical_202605",
    carrierId: "carrier_meritz_fire",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
    fileHashSha256: "bbbb86eb265233a01b71b0cc298748267531839a39bcf8aec79d442475274c0c",
    contentType: "application/pdf;charset=UTF-8",
    contentLengthBytes: 2776323,
    retrievedAt: meritzFireMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_meritz_direct_medical_business_method_202605",
    productSourceId: "src_meritz_direct_medical_202605",
    carrierId: "carrier_meritz_fire",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
    fileHashSha256: "2331cd4a07e8fabd5977e6a715a174d822a9ac495f5b956335d600b75b43d280",
    contentType: "application/pdf;charset=UTF-8",
    contentLengthBytes: 95371,
    retrievedAt: meritzFireMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_meritz_direct_medical_summary_202605",
    productSourceId: "src_meritz_direct_medical_202605",
    carrierId: "carrier_meritz_fire",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
    fileHashSha256: "6b02df741bb07a565d5315c3a5ce1655bcd56bdded61e9531c1bcaad60ce661e",
    contentType: "application/pdf;charset=UTF-8",
    contentLengthBytes: 127920,
    retrievedAt: meritzFireMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_heungkuk_fire_direct_medical_terms_202605",
    productSourceId: "src_heungkuk_fire_direct_medical_202605",
    carrierId: "carrier_heungkuk_fire",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do?_SERVICE_=CM_COMM_FileDownload_ACT&_TYPE_=M&_PRODTYPE_=4&scrId=CMMOBDPRM4001&fileType=4&downFileName=eYou_mdca_term_next.pdf",
    fileHashSha256: "956b60ab796fec97397fc087b799ed487b47a9773fb780fe7ee529c131389756",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 5125066,
    retrievedAt: heungkukFireMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_hanwha_general_direct_cancer_terms_202604",
    productSourceId: "src_hanwha_general_direct_cancer_202604",
    carrierId: "carrier_hanwha_general",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://www.hanwhadirect.com/clapdf/LA02969001.pdf",
    fileHashSha256: "ca8dd26a25c1aa60cefb4c298c8df843f8a35d5bf0ff758a0624e37ddaf15ca0",
    contentType: "application/pdf;charset=UTF-8",
    contentLengthBytes: 2071737,
    retrievedAt: hanwhaGeneralCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_db_life_eroun_cancer_terms_202601",
    productSourceId: "src_db_life_eroun_cancer_202601",
    carrierId: "carrier_db_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://www.idblife.com/notice/product/prov/file?publishNo=3196&fileGb=3%20&fileSeq=65059",
    fileHashSha256: "3c25a911b796fa239c45aec82afce4d24e310d76e516ad45ba86821cc58d0074",
    contentType: "application/octet-stream;;charset=utf-8",
    contentLengthBytes: 4247768,
    retrievedAt: dbLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_tongyang_life_wooriwon_cancer_summary_202603",
    productSourceId: "src_tongyang_wooriwon_cancer_202605",
    carrierId: "carrier_tongyang_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://pbano.myangel.co.kr/process/CO_ComDownload?FILE_GRP_ID=34D0mcpfsYQVpsLLoUEpB3x1Cudfk83B",
    fileHashSha256: "960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 355923,
    retrievedAt: tongyangLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_tongyang_life_wooriwon_cancer_business_202603",
    productSourceId: "src_tongyang_wooriwon_cancer_202605",
    carrierId: "carrier_tongyang_life",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://pbano.myangel.co.kr/process/CO_ComDownload?FILE_GRP_ID=34D0mcpfsYQVpsLLoUEpBzxfPnWb7yTo",
    fileHashSha256: "4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 99967,
    retrievedAt: tongyangLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_tongyang_life_wooriwon_cancer_terms_202603",
    productSourceId: "src_tongyang_wooriwon_cancer_202605",
    carrierId: "carrier_tongyang_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://pbano.myangel.co.kr/process/CO_ComDownload?FILE_GRP_ID=34D0mcpfsYQVpsLLoUEpBwjPN9vaY11S",
    fileHashSha256: "882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2",
    contentType: "application/octet-stream;charset=UTF-8",
    contentLengthBytes: 6512683,
    retrievedAt: tongyangLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_basic_summary_202604",
    productSourceId: "src_miraeasset_online_cancer_basic_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260401.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260401.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 3945603,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_basic_terms_202605",
    productSourceId: "src_miraeasset_online_cancer_basic_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260501.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260501.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 11732601,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_basic_business_202602",
    productSourceId: "src_miraeasset_online_cancer_basic_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_20260201.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_20260201.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 2676313,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_no_refund_summary_202604",
    productSourceId: "src_miraeasset_online_cancer_no_refund_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "summary",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260401.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%83%81%ED%92%88%EC%9A%94%EC%95%BD%EC%84%9C_20260401.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 3945603,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_no_refund_terms_202605",
    productSourceId: "src_miraeasset_online_cancer_no_refund_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260501.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%95%BD%EA%B4%80_20260501.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 11732601,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
  {
    id: "doc_miraeasset_online_cancer_no_refund_business_202602",
    productSourceId: "src_miraeasset_online_cancer_no_refund_202605",
    carrierId: "carrier_miraeasset_life",
    sourceType: "carrier_disclosure",
    documentType: "business_method",
    sourceUrl:
      "https://life.miraeasset.com/micro/cmmnFileDown.do?pathType=gongci_u1&fileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_20260201.pdf&orgFileName=%EC%98%A8%EB%9D%BC%EC%9D%B8+%EC%95%94%EB%B3%B4%ED%97%98+%EB%AC%B4%EB%B0%B0%EB%8B%B9_%EC%82%AC%EC%97%85%EB%B0%A9%EB%B2%95%EC%84%9C_20260201.pdf&filePath=%2Fuploadwas%2Flife%2F%2Fhtml%2Fgongci%2Fupload%2F1%2F",
    fileHashSha256: "be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f",
    contentType: "application/pdf;charset=ISO-8859-1",
    contentLengthBytes: 2676313,
    retrievedAt: miraeassetLifeCancerSnapshotReviewedAt,
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
  {
    id: "doc_lotte_direct_medical_terms_202605",
    productSourceId: "src_lotte_direct_medical_202605",
    carrierId: "carrier_lotte_insurance",
    sourceType: "carrier_disclosure",
    documentType: "terms",
    sourceUrl: "https://www.lotteins.co.kr/upload/C/let_care_sil_2605_yak.pdf",
    fileHashSha256: "593987e051e2ec7e04292740aeda4448a6a0a60da7d2fc56287c8746322e7168",
    contentType: "application/pdf",
    contentLengthBytes: 3867788,
    retrievedAt: lotteMedicalSnapshotReviewedAt,
    usageStatus: "link_only",
    parseStatus: "not_parsed",
    createdAt: now,
  },
];

type HanwhaLifeCarrierQuoteInput = {
  productSourceId: string;
  conditionId: string;
  age: number;
  sex: "male" | "female";
  sourceSexCode: "1" | "2";
  birthDate: string;
  planName: "표준체형" | "비흡연체형";
  smokingOptionDetailId: number;
  smokingOptionDetailCode: number;
  monthlyPremiumKrw: number;
  quoteHashSha256: string;
};

function buildHanwhaLifeQuoteParamsJson(input: HanwhaLifeCarrierQuoteInput) {
  const genderOption =
    input.sex === "male"
      ? { optionDetailId: 8333, optionDetailCode: 3 }
      : { optionDetailId: 8334, optionDetailCode: 4 };

  return JSON.stringify({
    onsureProdCode: "CMS00012",
    trnnUniqNo: null,
    inqyRqstOrgnCode: null,
    designCalculateOptionDtoList: [
      {
        optionId: 3067,
        optionCode: "OPT00001",
        optionDetailId: null,
        optionDetailCode: null,
        inputValue: input.birthDate,
        esbValue: null,
        optionDetailTypeCode: null,
        amountUnitCode: null,
      },
      {
        optionId: 3068,
        optionCode: "OPT00004",
        optionDetailId: 8323,
        optionDetailCode: 5,
        inputValue: "",
        esbValue: "10000000",
        optionDetailTypeCode: "SELECT",
        amountUnitCode: null,
      },
      {
        optionId: 3069,
        optionCode: "OPT00006",
        optionDetailId: 8332,
        optionDetailCode: 33,
        inputValue: "",
        esbValue: "X100",
        optionDetailTypeCode: "SELECT",
        amountUnitCode: null,
      },
      {
        optionId: 3070,
        optionCode: "OPT00003",
        optionDetailId: genderOption.optionDetailId,
        optionDetailCode: genderOption.optionDetailCode,
        inputValue: "",
        esbValue: input.sourceSexCode,
        optionDetailTypeCode: "SELECT",
        amountUnitCode: null,
      },
      {
        optionId: 3071,
        optionCode: "OPT00007",
        optionDetailId: 8338,
        optionDetailCode: 43,
        inputValue: "",
        esbValue: "N20",
        optionDetailTypeCode: "SELECT",
        amountUnitCode: null,
      },
      {
        optionId: 3072,
        optionCode: "OPT00002",
        optionDetailId: input.smokingOptionDetailId,
        optionDetailCode: input.smokingOptionDetailCode,
        inputValue: "",
        esbValue: "",
        optionDetailTypeCode: "SELECT",
        amountUnitCode: null,
      },
    ],
  });
}

function buildHanwhaLifeCarrierQuote(input: HanwhaLifeCarrierQuoteInput): InsurancePremiumQuoteSeed {
  return {
    id: `quote_${input.productSourceId}_${input.conditionId}_${input.quoteHashSha256.slice(0, 12)}`,
    productSourceId: input.productSourceId,
    carrierId: "carrier_hanwha_life",
    age: input.age,
    sex: input.sex,
    sourceSexCode: input.sourceSexCode,
    paymentCycle: "monthly",
    paymentPeriodYears: 20,
    insurancePeriodYears: 100,
    coverageAmountKrw: 10_000_000,
    planName: input.planName,
    renewalType: "non_renewable",
    ridersJson: null,
    premiumCurrency: "KRW",
    monthlyPremiumKrw: input.monthlyPremiumKrw,
    premiumText: `${input.monthlyPremiumKrw.toLocaleString("ko-KR")}원`,
    quoteSourceType: "carrier_quote",
    quoteSourceUrl: HANWHA_LIFE_QUOTE_SOURCE_URL,
    quoteParamsJson: buildHanwhaLifeQuoteParamsJson(input),
    quoteHashSha256: input.quoteHashSha256,
    retrievedAt: hanwhaLifeQuoteReviewedAt,
    reviewStatus: "approved",
    createdAt: now,
  };
}

const HANWHA_LIFE_CARRIER_QUOTE_ROWS: InsurancePremiumQuoteSeed[] = [
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_202604",
    conditionId: "age34_male",
    age: 34,
    sex: "male",
    sourceSexCode: "1",
    birthDate: "19920531",
    planName: "표준체형",
    smokingOptionDetailId: 8342,
    smokingOptionDetailCode: 1,
    monthlyPremiumKrw: 14840,
    quoteHashSha256: "70223172335be09d0a58c6fc249d9687ef3c4419077cbe951d8f18779bfe3371",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_202604",
    conditionId: "age34_female",
    age: 34,
    sex: "female",
    sourceSexCode: "2",
    birthDate: "19920531",
    planName: "표준체형",
    smokingOptionDetailId: 8342,
    smokingOptionDetailCode: 1,
    monthlyPremiumKrw: 10950,
    quoteHashSha256: "c087a26ded062d6ec8414bcd378230df0521217c5f3f24ec2f48b9dbd225bb5b",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_202604",
    conditionId: "age44_male",
    age: 44,
    sex: "male",
    sourceSexCode: "1",
    birthDate: "19820531",
    planName: "표준체형",
    smokingOptionDetailId: 8342,
    smokingOptionDetailCode: 1,
    monthlyPremiumKrw: 18680,
    quoteHashSha256: "2ee05759f0369ccfe34c0d7f5034acc961fd7a78f5c78dd559490c0e964a6bfc",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_202604",
    conditionId: "age44_female",
    age: 44,
    sex: "female",
    sourceSexCode: "2",
    birthDate: "19820531",
    planName: "표준체형",
    smokingOptionDetailId: 8342,
    smokingOptionDetailCode: 1,
    monthlyPremiumKrw: 12170,
    quoteHashSha256: "e8ab82d82bbc03d8b939273f8d9e3415e229767196ea88a47dd2e65fe390c1b6",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    conditionId: "age34_male",
    age: 34,
    sex: "male",
    sourceSexCode: "1",
    birthDate: "19920531",
    planName: "비흡연체형",
    smokingOptionDetailId: 8343,
    smokingOptionDetailCode: 2,
    monthlyPremiumKrw: 13460,
    quoteHashSha256: "ccaba48d12a1a8f8a870294f29eb86d9e14d23fb2ee842d8e0c5cfa061e3e669",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    conditionId: "age34_female",
    age: 34,
    sex: "female",
    sourceSexCode: "2",
    birthDate: "19920531",
    planName: "비흡연체형",
    smokingOptionDetailId: 8343,
    smokingOptionDetailCode: 2,
    monthlyPremiumKrw: 10850,
    quoteHashSha256: "48a19dd803f5407417ed5fae402bbdcca52368ba53098ca7070c7d4a07d4e646",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    conditionId: "age44_male",
    age: 44,
    sex: "male",
    sourceSexCode: "1",
    birthDate: "19820531",
    planName: "비흡연체형",
    smokingOptionDetailId: 8343,
    smokingOptionDetailCode: 2,
    monthlyPremiumKrw: 16820,
    quoteHashSha256: "247f93bf437b89aafbe221303680adba5233440fb44cce0509d52e6b427657bd",
  }),
  buildHanwhaLifeCarrierQuote({
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    conditionId: "age44_female",
    age: 44,
    sex: "female",
    sourceSexCode: "2",
    birthDate: "19820531",
    planName: "비흡연체형",
    smokingOptionDetailId: 8343,
    smokingOptionDetailCode: 2,
    monthlyPremiumKrw: 12060,
    quoteHashSha256: "262ab3606a15b42788f1fea1c6789fc47bd2d7cff737d7639f10569e93209fb3",
  }),
];

const HANWHA_LIFE_CARRIER_QUOTE_IDS = HANWHA_LIFE_CARRIER_QUOTE_ROWS.map(
  (quote) => quote.id
);

const KDB_DIRECT_CANCER_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "암진단보험금 I",
    "암진단보험금 II",
    "암진단보험금 III",
    "소액암진단보험금",
  ],
  variant_terms: ["해약환급금 미지급형III", "비갱신형 보험다모아 query"],
  quote_review_status: "approved",
  representative_condition_id: "age34_female",
  representative_premium_krw: 8020,
  approved_quote_condition_premiums_krw: {
    age34_male: 11230,
    age34_female: 8020,
    age44_male: 13340,
    age44_female: 8650,
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-05-30T16:30:00+09:00",
  },
};

const KDB_DIRECT_CANCER_CAVEATS = [
  "암진단보험금 I/II/III은 가입 후 90일 보장 제외 조건이 있다.",
  "암진단보험금과 소액암진단보험금은 가입 후 2년간 50% 감액지급 조건이 있다.",
  "기타피부암, 특정갑상선암, 대장점막내암, 비침습 방광암, 제자리암, 경계성종양은 소액암 급부로 분리된다.",
  "해약환급금 미지급형III는 보험료 납입기간 중 해지 시 해약환급금이 없고 납입기간 이후에도 표준형보다 적다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const SHINHAN_NO_REFUND_CANCER_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "암진단급여금",
    "여성유방암 진단급여금",
    "전립선암 진단급여금",
    "소액암 진단급여금",
  ],
  variant_terms: ["비갱신형", "해약환급금 미지급형"],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  representative_premium_krw: 6750,
  approved_quote_condition_premiums_krw: {
    age34_male: 8530,
    age34_female: 6750,
    age44_male: 10030,
    age44_female: 7320,
  },
  benefit_notes: {
    general_cancer_or_severe_thyroid_cancer:
      "보험가입금액의 100%, 계약일부터 1년 미만 지급사유 발생 시 50%",
    female_breast_cancer:
      "보험가입금액의 30%, 계약일부터 1년 미만 지급사유 발생 시 15%",
    prostate_cancer:
      "보험가입금액의 30%, 계약일부터 1년 미만 지급사유 발생 시 15%",
    minor_cancer:
      "기타피부암, 중증 이외 갑상선암, 제자리암, 경계성종양, 대장점막내암, 비침습방광암은 보험가입금액의 10%, 계약일부터 1년 미만 지급사유 발생 시 5%",
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-05-31T18:09:00+09:00",
  },
};

const SHINHAN_NO_REFUND_CANCER_CAVEATS = [
  "암 및 중증 갑상선암은 계약일을 포함해 90일이 지난 날의 다음 날부터 보장한다.",
  "계약일부터 1년 미만에 지급사유가 발생하면 암진단급여금, 여성유방암/전립선암 진단급여금, 소액암 진단급여금이 감액 지급된다.",
  "여성유방암과 전립선암은 일반 암진단급여금보다 낮은 별도 급부로 구분된다.",
  "기타피부암, 중증 이외 갑상선암, 제자리암, 경계성종양, 대장점막내암, 비침습방광암은 소액암 급부로 구분된다.",
  "해약환급금 미지급형은 보험료 납입기간 중 해지 시 해약환급금이 없다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const MIRAEASSET_LIFE_CANCER_COMMON_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "암 진단보험금",
    "일반암",
    "여성유방암",
    "전립선암",
    "기타피부암",
    "갑상선암",
    "대장점막내암",
    "비침습방광암",
    "제자리암",
    "경계성종양",
  ],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  document_evidence: {
    carrier_match_score: 1,
    terms_title: "온라인 암보험 무배당 [기본형/해약환급금이 없는 유형]",
    product_codes: ["21279", "21280"],
    shared_document_hashes: [
      "133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f",
      "8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378",
      "be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f",
    ],
  },
  benefit_notes: {
    general_cancer:
      "보험가입금액 1,000만원 기준 계약일부터 2년 미만 500만원, 2년 이후 1,000만원",
    female_breast_or_prostate_cancer:
      "보험가입금액 1,000만원 기준 계약일부터 2년 미만 100만원, 2년 이후 200만원",
    lower_benefit_cancers:
      "기타피부암, 중증갑상선암 제외 갑상선암, 대장점막내암, 비침습방광암, 제자리암, 경계성종양은 각각 50만원/100만원 기준",
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-06-01T00:48:00+09:00",
  },
};

const MIRAEASSET_LIFE_CANCER_COMMON_CAVEATS = [
  "약관은 기본형과 해약환급금이 없는 유형을 함께 다루므로 source별 문서 row ID는 분리하되 같은 hash를 공유한다.",
  "암 보장개시일은 계약일 또는 부활일부터 90일이 지난 날의 다음 날이다.",
  "보험가입금액 1,000만원 기준 일반암은 계약일부터 2년 미만 500만원, 2년 이후 1,000만원으로 지급금액이 다르다.",
  "여성유방암 또는 전립선암은 일반암과 별도 급부이며 2년 미만 100만원, 2년 이후 200만원 기준이다.",
  "기타피부암, 갑상선암(중증갑상선암 제외), 대장점막내암, 비침습방광암, 제자리암, 경계성종양은 각각 50만원/100만원 기준의 별도 급부다.",
  "기타피부암, 갑상선암(중증갑상선암 제외), 대장점막내암, 비침습방광암, 제자리암, 경계성종양 진단은 보험료 납입면제 대상이 아니다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const MIRAEASSET_LIFE_CANCER_BASIC_DETAILS = {
  ...MIRAEASSET_LIFE_CANCER_COMMON_DETAILS,
  variant_terms: ["기본형", "상품코드 21279"],
  representative_premium_krw: 4510,
  approved_quote_condition_premiums_krw: {
    age34_male: 5970,
    age34_female: 4510,
    age44_male: 13000,
    age44_female: 7780,
  },
};

const MIRAEASSET_LIFE_CANCER_BASIC_CAVEATS = [
  ...MIRAEASSET_LIFE_CANCER_COMMON_CAVEATS,
  "기본형 source는 해약환급금이 없는 유형과 보험료 및 해약환급금 조건을 분리해 표시한다.",
];

const MIRAEASSET_LIFE_CANCER_NO_REFUND_DETAILS = {
  ...MIRAEASSET_LIFE_CANCER_COMMON_DETAILS,
  variant_terms: ["해약환급금이 없는 유형", "상품코드 21280"],
  representative_premium_krw: 6490,
  approved_quote_condition_premiums_krw: {
    age34_male: 8910,
    age34_female: 6490,
    age44_male: 10700,
    age44_female: 7060,
  },
};

const MIRAEASSET_LIFE_CANCER_NO_REFUND_CAVEATS = [
  ...MIRAEASSET_LIFE_CANCER_COMMON_CAVEATS,
  "해약환급금이 없는 유형은 해지 시 환급금 조건이 기본형과 다를 수 있으므로 추천 카드 caveat에 명시한다.",
];

const HANWHA_GENERAL_CANCER_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "암(4대유사암제외)진단비",
    "4대유사암진단비",
    "10대고액치료비암진단비",
  ],
  optional_benefit_terms: [
    "암(4대유사암제외)항암방사선치료비",
    "암(4대유사암제외)항암약물치료비",
    "암(특정유사암포함)표적항암약물허가치료비",
    "암(특정유사암포함)항암양성자방사선치료비",
    "암(특정유사암포함)항암세기조절방사선치료비",
    "카티(CAR-T)항암약물허가치료비",
    "다빈치로봇수술비",
    "암 직접치료 입원비",
    "암 수술비",
  ],
  similar_cancer_terms: [
    "기타피부암",
    "갑상선암",
    "제자리암",
    "경계성종양",
  ],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  representative_premium_krw: 12204,
  approved_quote_condition_premiums_krw: {
    age34_male: 13721,
    age34_female: 12204,
    age44_male: 17151,
    age44_female: 13018,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
    official_product_page: "https://www.hanwhadirect.com/landing.do?cmpgId=1000001444",
    document_url: "https://www.hanwhadirect.com/clapdf/LA02969001.pdf",
    js_download_path: "https://www.hanwhadirect.com/resource/inspl/ltr/cncr/js/main.js?sid=20260601",
    document_hash_sha256: "ca8dd26a25c1aa60cefb4c298c8df843f8a35d5bf0ff758a0624e37ddaf15ca0",
    document_revision_date: "2026-04-01",
  },
};

const HANWHA_GENERAL_CANCER_CAVEATS = [
  "선택특약형 상품이므로 실제 가입 담보에 따라 보장 범위가 달라질 수 있다.",
  "암(4대유사암제외)진단비는 계약일부터 90일 이하에는 지급금액이 없고, 90일 초과 1년 미만에는 보험가입금액의 50%, 1년 이상에는 보험가입금액을 기준으로 지급한다.",
  "4대유사암은 기타피부암, 갑상선암, 제자리암, 경계성종양으로 정의되며 일반암과 별도 급부로 표시한다.",
  "4대유사암진단비는 세부보장별로 계약일부터 1년 미만 보험가입금액 50%, 1년 이상 보험가입금액 기준이다.",
  "특정유사암은 기타피부암과 갑상선암으로 정의되며, 표적항암, 양성자방사선, 세기조절방사선, 재활, 호스피스, 다빈치로봇수술 등은 가입 특약별 조건을 따른다.",
  "갱신형 특별약관은 10년 갱신주기와 갱신일 현재 기초율을 적용하므로 나이 증가와 기초율 변동에 따라 보험료가 인상 또는 인하될 수 있다.",
  "보험료 납입면제는 암 진단확정 시 적용되지만 기타피부암, 갑상선암, 제자리암, 경계성종양은 제외되고, 갱신형 특별약관은 납입면제 대상에서 제외된다.",
  "해약환급금은 납입한 보험료보다 적거나 없을 수 있다.",
];

const DB_LIFE_CANCER_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "암진단자금",
    "특정3대암진단자금",
    "소액암진단자금",
  ],
  benefit_timing_terms: [
    "암 보장개시일 90일",
    "계약일부터 1년 미만 50% 지급",
    "유방암 180일 경과 이전 20% 지급",
  ],
  small_cancer_terms: [
    "기타피부암",
    "특정갑상선암",
    "대장점막내암",
  ],
  variant_terms: ["해약환급금 미지급형", "2601", "무배당 e로운 암보험"],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  representative_premium_krw: 9700,
  approved_quote_condition_premiums_krw: {
    age34_female: 9700,
    age34_male: 10300,
    age44_female: 10900,
    age44_male: 13300,
  },
  document_evidence: {
    carrier_match_score: 1,
    terms_title: "무배당 e로운 암보험(해약환급금 미지급형)(2601)",
    product_type: "암보험",
    document_url:
      "https://www.idblife.com/notice/product/prov/file?publishNo=3196&fileGb=3%20&fileSeq=65059",
    terms_sha256: "3c25a911b796fa239c45aec82afce4d24e310d76e516ad45ba86821cc58d0074",
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-06-01T03:34:00+09:00",
  },
};

const DB_LIFE_CANCER_CAVEATS = [
  "암 보장개시일은 계약일 또는 부활일부터 그 날을 포함하여 90일이 지난 날의 다음날이므로 초기 90일 보장 제외 조건이 있다.",
  "계약일부터 1년 미만에 암, 특정3대암, 소액암 지급사유가 발생하면 지급금액의 50% 기준을 적용한다.",
  "유방암은 보험계약일로부터 180일 경과 이전 진단확정 시 암진단자금의 20% 지급 조건이 있다.",
  "소액암과 특정3대암은 일반 암진단자금과 별도 급부로 표시하며, 기타피부암, 특정갑상선암, 대장점막내암 등 분류 차이를 설명한다.",
  "해약환급금 미지급형은 보험료 납입기간 중 해지 시 해약환급금이 없고, 납입기간 이후 해지 시 표준형 해약환급금의 50% 기준이다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const TONGYANG_LIFE_CANCER_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "고액치료비관련 암진단비",
    "고액치료비관련 암이외의 암진단비",
    "기타피부암진단비",
    "갑상선암진단비",
    "제자리암진단비",
    "경계성종양진단비",
  ],
  optional_benefit_terms: [
    "암(소액암제외)진단비특약",
    "암통원특약",
    "특정면역항암약물허가치료특약(갱신형)",
    "표적항암약물허가치료특약(갱신형)",
    "항암방사선·약물치료특약",
  ],
  benefit_timing_terms: [
    "암 보장개시일 90일",
    "계약일부터 1년 미만 50% 지급",
    "유방암 180일 이전 진단 시 고액치료비관련 암이외의 암진단비 10% 지급",
  ],
  small_cancer_terms: [
    "기타피부암",
    "갑상선암",
    "제자리암",
    "경계성종양",
    "대장점막내암",
  ],
  variant_terms: [
    "무배당우리WON하는실속하나로암보험",
    "2026.03.01",
    "월납",
    "20년만기/30년만기/100세만기 선택 가능",
  ],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  representative_premium_krw: 11000,
  approved_quote_condition_premiums_krw: {
    age34_male: 9700,
    age34_female: 11000,
    age44_male: 17100,
    age44_female: 14100,
  },
  document_evidence: {
    carrier_match_score: 1,
    source_page_url: "https://pbano.myangel.co.kr/paging/WE_AC_WEPAAP020100L",
    download_endpoint: "https://pbano.myangel.co.kr/process/CO_ComDownload",
    document_types: ["summary", "business_method", "terms"],
    effective_date: "2026.03.01",
    document_hashes: [
      "960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5",
      "4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f",
      "882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2",
    ],
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-06-01T13:20:00+09:00",
  },
};

const TONGYANG_LIFE_CANCER_CAVEATS = [
  "암 보장개시일은 계약일 또는 부활일부터 그 날을 포함하여 90일이 지난 날의 다음날이므로 초기 90일 암 보장 제외 조건이 있다.",
  "고액치료비관련 암, 고액치료비관련 암이외의 암, 기타피부암, 갑상선암, 제자리암, 경계성종양은 계약일부터 1년 미만 진단확정 시 50% 지급 조건이 있다.",
  "유방암은 계약일로부터 180일 경과 이전 진단확정 시 고액치료비관련 암이외의 암진단비의 10% 지급 조건이 있다.",
  "기타피부암과 갑상선암은 암의 정의에서 제외되며, 중증 갑상선암은 암의 정의에 포함되는 분류 차이가 있다.",
  "제자리암, 경계성종양, 기타피부암, 갑상선암은 보험료 납입면제 대상에서 제외되며 중증 갑상선암은 예외로 납입면제 가능성이 있다.",
  "표적항암약물허가치료특약과 특정면역항암약물허가치료특약은 갱신형 특약이므로 갱신 시 연령 증가와 위험률 변동에 따라 보험료가 변동될 수 있다.",
  "보험기간, 납입기간, 가입나이, 가입금액은 선택 조건에 따라 달라지고 피보험자의 기존 보험가입상황, 나이, 계약 전 알릴 의무사항에 따라 건강진단 및 인수심사가 필요할 수 있다.",
  "해약환급금은 납입한 보험료보다 적거나 없을 수 있으며, 최종 가입 전 공식 약관과 상품요약서를 확인해야 한다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const KYOBOLIFEPLANET_CANCER_COMMON_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "일반암 진단보험금",
    "고액암 진단보험금",
    "유방암 및 전립선암 진단보험금",
    "소액암 및 유사암 진단보험금",
    "All 페이백 일반암 진단보험금",
  ],
  quote_review_status: "approved",
  representative_condition_id: "age34_female",
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-05-30T16:30:00+09:00",
  },
};

const KYOBOLIFEPLANET_CANCER_COMMON_CAVEATS = [
  "일반암, 고액암, 유방암 및 전립선암, All 페이백 일반암은 가입 후 90일 보장 제외 조건이 있다.",
  "가입 후 1년 미만에는 일반암, 고액암, 유방암 및 전립선암, 소액암 및 유사암 등 주요 급부가 50% 감액지급된다.",
  "유방암, 전립선암, 기타피부암, 중증 이외 갑상선암, 대장점막내암, 경계성종양, 제자리암은 일반암과 다른 급부로 표시해야 한다.",
  "해약환급금 미지급형은 보험료 납입기간 중 해지 시 해약환급금이 없고 납입완료 이후에는 지급형 상품 해약환급금의 50%를 지급한다.",
];

const KYOBOLIFEPLANET_CANCER_NONSMOKER_DETAILS = {
  ...KYOBOLIFEPLANET_CANCER_COMMON_DETAILS,
  variant_terms: ["비흡연체", "비갱신형", "해약환급금 미지급형"],
  representative_premium_krw: 8410,
  approved_quote_condition_premiums_krw: {
    age34_male: 10710,
    age34_female: 8410,
    age44_male: 12910,
    age44_female: 9120,
  },
};

const KYOBOLIFEPLANET_CANCER_NONSMOKER_CAVEATS = [
  ...KYOBOLIFEPLANET_CANCER_COMMON_CAVEATS,
  "비흡연체는 최근 1년 비흡연, 만 19세 이상, 흡연 검사 등 가입 조건이 있으며 보험기간 중 흡연 상태가 바뀌면 표준체 보험료 적용이나 보험가입금액 감액 caveat가 발생할 수 있다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const KYOBOLIFEPLANET_CANCER_STANDARD_DETAILS = {
  ...KYOBOLIFEPLANET_CANCER_COMMON_DETAILS,
  variant_terms: ["표준체", "비갱신형", "해약환급금 미지급형"],
  representative_premium_krw: 8490,
  approved_quote_condition_premiums_krw: {
    age34_male: 11320,
    age34_female: 8490,
    age44_male: 13700,
    age44_female: 9210,
  },
};

const KYOBOLIFEPLANET_CANCER_STANDARD_CAVEATS = [
  ...KYOBOLIFEPLANET_CANCER_COMMON_CAVEATS,
  "표준체 source는 비흡연체 할인특약을 적용하지 않는 기준 상품으로 비흡연체 source와 quote row를 분리해야 한다.",
  "대표 보험료는 보험다모아 age34_female 조건이며 사용자 실제 조건에 따라 달라질 수 있다.",
];

const HANWHA_LIFE_CANCER_COMMON_DETAILS = {
  coverage_category: "oncology",
  matching_strategy: "risk_target",
  risk_targets: ONCOLOGY_RISK_TARGETS,
  primary_benefit_terms: [
    "일반암 진단자금",
    "특정고액치료비암 진단자금",
    "초기 이외 갑상선암 진단자금",
    "기타피부암 진단자금",
    "대장점막내암 진단자금",
  ],
  quote_review_status: "approved",
  quote_source_type: "carrier_quote",
  representative_condition_id: "age34_female",
  quote_basis: {
    product_code: "CMS00012",
    product_version: "55",
    product_reference_date: "20260529",
    guarantee_amount_krw: 10_000_000,
    insurance_term: "100세 만기",
    payment_term: "20년납",
    payment_cycle: "월납",
  },
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-05-31T00:49:37.412+09:00",
  },
};

const HANWHA_LIFE_CANCER_COMMON_CAVEATS = [
  "암 관련 주요 급부는 가입 후 90일 동안 보장 제외될 수 있다.",
  "계약 초기에는 급부별 보험금이 일부만 지급되는 감액지급 조건이 있을 수 있다.",
  "직결장암, 유방암, 여성생식기암, 전립선암, 기타피부암, 갑상선암, 대장점막내암 등은 일반암과 급부가 다를 수 있다.",
  "해약환급금 미지급형은 보험료 납입기간 중 해지 시 해약환급금이 없을 수 있다.",
  "대표 보험료와 조건별 보험료는 한화생명 공식 다이렉트 계산 API 기준이며 실제 청약 단계의 인수심사 결과에 따라 달라질 수 있다.",
];

const HANWHA_LIFE_CANCER_STANDARD_DETAILS = {
  ...HANWHA_LIFE_CANCER_COMMON_DETAILS,
  variant_terms: ["표준체형", "비갱신형", "해약환급금 미지급형"],
  representative_premium_krw: 10950,
  approved_quote_condition_premiums_krw: {
    age34_male: 14840,
    age34_female: 10950,
    age44_male: 18680,
    age44_female: 12170,
  },
};

const HANWHA_LIFE_CANCER_STANDARD_CAVEATS = [
  ...HANWHA_LIFE_CANCER_COMMON_CAVEATS,
  "표준체형 source는 비흡연체 할인 조건을 적용하지 않는 기준 상품으로 비흡연체 source와 quote row를 분리한다.",
];

const HANWHA_LIFE_CANCER_NONSMOKER_DETAILS = {
  ...HANWHA_LIFE_CANCER_COMMON_DETAILS,
  variant_terms: ["비흡연체형", "비갱신형", "해약환급금 미지급형"],
  representative_premium_krw: 10850,
  approved_quote_condition_premiums_krw: {
    age34_male: 13460,
    age34_female: 10850,
    age44_male: 16820,
    age44_female: 12060,
  },
};

const HANWHA_LIFE_CANCER_NONSMOKER_CAVEATS = [
  ...HANWHA_LIFE_CANCER_COMMON_CAVEATS,
  "비흡연체형은 만 19세 이상, 표준체형 가입 가능 상태, 최근 1년 비흡연 등 가입 조건이 있으며 흡연 상태 변경 시 표준체형 보험료 적용, 정산차액, 보험가입금액 감액 가능성이 있다.",
];

const MEDICAL_BASELINE_COMMON_DETAILS = {
  coverage_category: "medical_expense",
  matching_strategy: "baseline",
  risk_targets: [],
  baseline_terms: [
    "실손의료비",
    "질병 치료비",
    "상해 치료비",
    "급여 의료비",
    "비급여 의료비",
  ],
  quote_review_status: "approved",
  quote_source_type: "e_insmarket",
  representative_condition_id: "age34_female",
  usdc_conversion: {
    basis: "fixed_demo_rate",
    krw_per_usdc: FIRST_SNAPSHOT_KRW_PER_USDC,
    approved_at: "2026-05-31T02:49:00+09:00",
  },
};

const MEDICAL_BASELINE_COMMON_CAVEATS = [
  "유전자 위험 특화 추천이 아니라 기본 의료비 방어 baseline으로 표시한다.",
  "실손의료보험은 자기부담금, 급여/비급여, 보장 한도, 갱신 조건이 적용된다.",
  "보험다모아 quote는 공개 비교 조건 기준 예시 보험료이며 개인별 인수 심사 견적이 아니다.",
  "갱신 시 보험료가 달라질 수 있다.",
];

const DB_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 6854,
  approved_quote_condition_premiums_krw: {
    age34_male: 6219,
    age34_female: 6854,
    age44_male: 9320,
    age44_female: 11030,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms", "business_method", "summary"],
  },
};

const DB_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "DB손보 source는 약관, 사업방법서, 상품요약서 hash가 모두 확보되어 대표 문서와 보조 문서 확인이 가능하다.",
];

const KB_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 6439,
  approved_quote_condition_premiums_krw: {
    age34_male: 6400,
    age34_female: 6439,
    age44_male: 9074,
    age44_female: 10323,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
  },
};

const KB_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "KB손보 source의 대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
  "고정 PDF URL은 정기 refresh 시 hash 변경 여부를 재확인한다.",
];

const SAMSUNG_FIRE_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 7503,
  approved_quote_condition_premiums_krw: {
    age34_male: 6575,
    age34_female: 7503,
    age44_male: 9546,
    age44_female: 11938,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
    product_specific_reprobe: {
      direct_product_page_url: "https://direct.samsungfire.com/mall/PP030404_001.html?pcMode=true",
      document_url: "https://direct.samsungfire.com/docs/realloss.pdf",
      document_hash_sha256: "db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415",
      product_version: "2605.1",
    },
  },
};

const SAMSUNG_FIRE_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "직접 상품 상세 페이지와 PDF 텍스트 근거로 realloss.pdf가 삼성화재 다이렉트 실손의료비보험(2605.1) 약관임을 확인했다.",
  "대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
];

const HYUNDAI_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 6545,
  approved_quote_condition_premiums_krw: {
    age34_male: 6740,
    age34_female: 6545,
    age44_male: 9190,
    age44_female: 9949,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
  },
};

const HYUNDAI_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "현대해상 source는 갱신형 상품이므로 갱신 보험료 변동과 재가입 조건을 추천 카드 caveat에 표시한다.",
  "대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
];

const NH_FIRE_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 5745,
  approved_quote_condition_premiums_krw: {
    age34_male: 5745,
    age34_female: 5745,
    age44_male: 7364,
    age44_female: 7364,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
    official_product_page: "https://www.nhfire.co.kr/product/retrieveProduct.nhfire?pdtCd=D711117",
    document_hash_sha256: "0306fb42f84fa976ff9680aadf6a1b348e87d5c99cd503e85b1e82b9bf728048",
    document_variant: "전환계약용",
  },
};

const NH_FIRE_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "농협손보 공식 약관 파일명은 헤아림다이렉트실손의료비보험(전환계약용)2605이므로 전환계약용 variant caveat를 표시한다.",
  "대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
];

const MERITZ_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 7103,
  approved_quote_condition_premiums_krw: {
    age34_male: 6643,
    age34_female: 7103,
    age44_male: 8635,
    age44_female: 10519,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms", "business_method", "summary"],
    official_product_page: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
    pdf_list_api: "https://store.meritzfire.com/json.smart",
    product_code: "6ADGE",
    document_hash_sha256: [
      "bbbb86eb265233a01b71b0cc298748267531839a39bcf8aec79d442475274c0c",
      "2331cd4a07e8fabd5977e6a715a174d822a9ac495f5b956335d600b75b43d280",
      "6b02df741bb07a565d5315c3a5ce1655bcd56bdded61e9531c1bcaad60ce661e",
    ],
    citation_policy:
      "session-bound encrypted fileDownload URL은 저장하지 않고 공식 상품 페이지와 adapter 재실행으로 hash를 재검증한다.",
  },
};

const MERITZ_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "메리츠화재 PDF 다운로드는 session-bound encrypted URL이므로 공식 상품 페이지와 adapter 재검증 절차를 출처 caveat로 표시한다.",
  "사업방법서와 상품요약서 파일명에는 2408이 포함되지만 2026-05-31 기준 공식 상품 페이지의 6ADGE 문서 목록에서 같은 상품명으로 제공된 파일이다.",
  "대표 문서는 약관이며, 사업방법서와 상품요약서 hash도 source evidence로 함께 보존한다.",
];

const HEUNGKUK_FIRE_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 8939,
  approved_quote_condition_premiums_krw: {
    age34_male: 7995,
    age34_female: 8939,
    age44_male: 10497,
    age44_female: 13029,
  },
  document_evidence: {
    carrier_match_score: 1,
    document_types: ["terms"],
    official_product_page: "https://direct.heungkukfire.co.kr/?ccid=0606001007#/CMMOBDPRM4001",
    pdf_endpoint: "https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do",
    screen_id: "CMMOBDPRM4001",
    document_hash_sha256: "956b60ab796fec97397fc087b799ed487b47a9773fb780fe7ee529c131389756",
    document_variant: "eYou_mdca_term_next.pdf",
  },
};

const HEUNGKUK_FIRE_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "흥국화재 공식 약관 파일명은 eYou_mdca_term_next.pdf이므로 seed/apply 전 adapter 재실행으로 hash 신선도를 확인한다.",
  "대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
];

const LOTTE_DIRECT_MEDICAL_DETAILS = {
  ...MEDICAL_BASELINE_COMMON_DETAILS,
  representative_premium_krw: 15675,
  approved_quote_condition_premiums_krw: {
    age34_male: 12183,
    age34_female: 15675,
    age44_male: 17565,
    age44_female: 21254,
  },
  document_evidence: {
    carrier_match_score: 0.65,
    document_types: ["terms"],
    official_product_page: "https://www.lotteins.co.kr/web/C/D/A/cda020.jsp?prdtseq=11",
    official_pdf_url: "https://www.lotteins.co.kr/upload/C/let_care_sil_2605_yak.pdf",
    page_charset: "EUC-KR",
    document_hash_sha256: "593987e051e2ec7e04292740aeda4448a6a0a60da7d2fc56287c8746322e7168",
    document_variant: "let_care_sil_2605_yak.pdf",
  },
};

const LOTTE_DIRECT_MEDICAL_CAVEATS = [
  ...MEDICAL_BASELINE_COMMON_CAVEATS,
  "롯데손보 공식 상품 페이지는 EUC-KR HTML이고 약관보기 버튼으로 let_care_sil_2605_yak.pdf를 제공하므로 adapter 실행 시 charset 처리와 PDF URL 신선도를 확인한다.",
  "대표 문서는 약관 1건이며, 상품요약서와 사업방법서 hash는 아직 별도 row로 확보하지 않았다.",
  "실손의료보험은 통원 한도, 자기부담금, 급여/비급여, 갱신/재가입 조건이 적용된다.",
];

const FIRST_RECOMMENDATION_SOURCE_APPROVALS: InsuranceProductSourceApproval[] = [
  {
    id: "src_shinhan_life_sol_cancer_202601",
    values: {
      officialProductUrl: "https://s.shinhanlife.co.kr/sht/6Nf1STxRv62YxH2X1wZxjQYN2qx3K.cs",
      saleStatus: "active",
      saleStatusEvidence:
        "신한라이프 공식 상품요약서, 사업방법서, 판매약관 PDF 3건의 SHA-256을 재다운로드 기준으로 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 6750,
      premiumText: "6,750원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "신한라이프 해약환급금 미지급형 비갱신 암보험. 암진단급여금과 여성유방암/전립선암/소액암 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 1년 미만 감액, 여성유방암/전립선암 급부 분리, 소액암 분리, 해약환급금 미지급형 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(SHINHAN_NO_REFUND_CANCER_DETAILS),
      coverageCaveatsJson: JSON.stringify(SHINHAN_NO_REFUND_CANCER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: shinhanNoRefundSnapshotReviewedAt,
      lastVerifiedAt: shinhanNoRefundSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_miraeasset_online_cancer_basic_202605",
    values: {
      officialProductUrl: "https://life.miraeasset.com/online/index.do?_OC_=1363#MO-DR-020000-000000",
      saleStatus: "active",
      saleStatusEvidence:
        "미래에셋생명 공식 상품공시 화면의 2026-05-01 온라인 암보험 무배당 row에서 상품요약서, 약관, 사업방법서 PDF 3건의 SHA-256을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 4510,
      premiumText: "4,510원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "unknown",
      coverageSummary:
        "미래에셋생명 온라인 암보험 기본형. 일반암과 여성유방암/전립선암 및 소액암성 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 2년 미만 감액, 여성유방암/전립선암 급부 분리, 기타피부암/갑상선암 등 별도 급부를 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_BASIC_DETAILS),
      coverageCaveatsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_BASIC_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: miraeassetLifeCancerSnapshotReviewedAt,
      lastVerifiedAt: miraeassetLifeCancerSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_miraeasset_online_cancer_no_refund_202605",
    values: {
      officialProductUrl: "https://life.miraeasset.com/online/index.do?_OC_=1363#MO-DR-020000-000000",
      saleStatus: "active",
      saleStatusEvidence:
        "미래에셋생명 공식 상품공시 화면의 2026-05-01 온라인 암보험 무배당 row에서 상품요약서, 약관, 사업방법서 PDF 3건의 SHA-256을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 6490,
      premiumText: "6,490원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "unknown",
      coverageSummary:
        "미래에셋생명 온라인 암보험 해약환급금이 없는 유형. 일반암과 여성유방암/전립선암 및 소액암성 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 2년 미만 감액, 여성유방암/전립선암 급부 분리, 기타피부암/갑상선암 등 별도 급부와 해약환급금이 없는 유형 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_NO_REFUND_DETAILS),
      coverageCaveatsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_NO_REFUND_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: miraeassetLifeCancerSnapshotReviewedAt,
      lastVerifiedAt: miraeassetLifeCancerSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_hanwha_general_direct_cancer_202604",
    values: {
      officialProductUrl: "https://www.hanwhadirect.com/landing.do?cmpgId=1000001444",
      saleStatus: "active",
      saleStatusEvidence:
        "한화손보 다이렉트 화면의 main.js 약관 다운로드 경로와 공식 clapdf PDF hash를 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 12204,
      premiumText: "12,204원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "unknown",
      coverageSummary:
        "한화손보 다이렉트 내가고른 암보험. 암(4대유사암제외)진단비, 4대유사암진단비, 항암치료, 수술, 입원 특약을 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "선택특약형 상품, 90일 면책, 1년 미만 감액, 4대유사암 별도 급부, 갱신형 특약 보험료 변동, 납입면제 제외 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(HANWHA_GENERAL_CANCER_DETAILS),
      coverageCaveatsJson: JSON.stringify(HANWHA_GENERAL_CANCER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: hanwhaGeneralCancerSnapshotReviewedAt,
      lastVerifiedAt: hanwhaGeneralCancerSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_db_life_eroun_cancer_202601",
    values: {
      officialProductUrl: "https://direct.idblife.com/",
      saleStatus: "active",
      saleStatusEvidence:
        "DB생명 상품공시 판매상품 페이지 publishNo=3196에서 공식 약관 PDF hash를 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 9700,
      premiumText: "9,700원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "unknown",
      coverageSummary:
        "DB생명 e로운 암보험 해약환급금 미지급형. 암진단자금, 특정3대암진단자금, 소액암진단자금을 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 1년 미만 감액, 유방암 180일 이전 20% 지급, 소액암/특정3대암 분리, 해약환급금 미지급형 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(DB_LIFE_CANCER_DETAILS),
      coverageCaveatsJson: JSON.stringify(DB_LIFE_CANCER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: dbLifeCancerSnapshotReviewedAt,
      lastVerifiedAt: dbLifeCancerSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_tongyang_wooriwon_cancer_202605",
    values: {
      officialProductUrl: "https://pbano.myangel.co.kr/paging/WE_AC_WEPAAP020100L",
      saleStatus: "active",
      saleStatusEvidence:
        "동양생명 공식 판매상품 공시 페이지의 2026-03-01 무배당우리WON하는실속하나로암보험 row에서 상품요약서, 사업방법서, 보험약관 FILE_GRP_ID와 SHA-256 hash 3건을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 11000,
      premiumText: "11,000원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "unknown",
      coverageSummary:
        "동양생명 우리WON하는실속하나로암보험. 고액치료비관련 암, 일반암성 급부, 소액암성 급부, 암 치료 특약을 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 1년 미만 감액, 유방암 180일 이전 10% 지급, 소액암/갑상선/피부암 분리, 갱신형 특약 보험료 변동 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(TONGYANG_LIFE_CANCER_DETAILS),
      coverageCaveatsJson: JSON.stringify(TONGYANG_LIFE_CANCER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: tongyangLifeCancerSnapshotReviewedAt,
      lastVerifiedAt: tongyangLifeCancerSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_hanwha_life_e_cancer_202604",
    values: {
      officialProductUrl:
        "https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer",
      saleStatus: "active",
      saleStatusEvidence:
        "한화생명 공식 다이렉트 상품 페이지 CMS00012 상품 버전 55, 기준일 20260529와 공식 계산 API carrier quote 4건을 확인했다.",
      monthlyPremiumKrw: 10950,
      premiumText: "10,950원",
      premiumBasis: HANWHA_LIFE_CARRIER_QUOTE_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "한화생명 표준체형 e암보험. 일반암과 특정암 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 초기 감액, 암 급부 분리, 해약환급금 미지급형 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(HANWHA_LIFE_CANCER_STANDARD_DETAILS),
      coverageCaveatsJson: JSON.stringify(HANWHA_LIFE_CANCER_STANDARD_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: hanwhaLifeQuoteReviewedAt,
      lastVerifiedAt: hanwhaLifeQuoteReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_hanwha_life_e_cancer_nonsmoker_202604",
    values: {
      officialProductUrl:
        "https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer",
      saleStatus: "active",
      saleStatusEvidence:
        "한화생명 공식 다이렉트 상품 페이지 CMS00012 상품 버전 55, 기준일 20260529와 공식 계산 API carrier quote 4건을 확인했다.",
      monthlyPremiumKrw: 10850,
      premiumText: "10,850원",
      premiumBasis: HANWHA_LIFE_CARRIER_QUOTE_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "한화생명 비흡연체형 e암보험. 일반암과 특정암 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 초기 감액, 암 급부 분리, 해약환급금 미지급형, 비흡연체형 가입 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(HANWHA_LIFE_CANCER_NONSMOKER_DETAILS),
      coverageCaveatsJson: JSON.stringify(HANWHA_LIFE_CANCER_NONSMOKER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: hanwhaLifeQuoteReviewedAt,
      lastVerifiedAt: hanwhaLifeQuoteReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_kdb_life_direct_cancer_202605",
    values: {
      officialProductUrl: "https://direct.kdblife.co.kr/edirect/product/cancerDetail.do?ev=1533801",
      saleStatus: "active",
      saleStatusEvidence:
        "보험다모아 2026-05 quote matrix에서 숫자 월 보험료 4건을 확인했고 KDB 공식 40869_summary/40870_policy 문서 hash를 검수했다.",
      monthlyPremiumKrw: 8020,
      premiumText: "8,020원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "암진단보험금 I/II/III 및 소액암진단보험금 중심의 KDB생명 암보험. DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 2년 감액, 소액암 급부 분리, 해약환급금 미지급형III 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(KDB_DIRECT_CANCER_DETAILS),
      coverageCaveatsJson: JSON.stringify(KDB_DIRECT_CANCER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: firstRecommendationSnapshotReviewedAt,
      lastVerifiedAt: firstRecommendationSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    values: {
      officialProductUrl: "https://www.lifeplanet.co.kr/lpds2/insurance/protection-cancer-insurance.dev",
      saleStatus: "active",
      saleStatusEvidence:
        "보험다모아 2026-05 quote matrix에서 숫자 월 보험료 4건을 확인했고 교보라이프플래닛 HPDA01S0 공시 문서 hash 3건을 검수했다.",
      monthlyPremiumKrw: 8410,
      premiumText: "8,410원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "교보라이프플래닛 비흡연체 암보험. 일반암, 고액암, 유방암 및 전립선암, 소액암 및 유사암 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 1년 감액, 소액암/유사암 급부 분리, 해약환급금 미지급형, 비흡연체 가입 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_NONSMOKER_DETAILS),
      coverageCaveatsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_NONSMOKER_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: firstRecommendationSnapshotReviewedAt,
      lastVerifiedAt: firstRecommendationSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_kyobo_lifeplanet_cancer_standard_202605",
    values: {
      officialProductUrl: "https://www.lifeplanet.co.kr/lpds2/insurance/protection-cancer-insurance.dev",
      saleStatus: "active",
      saleStatusEvidence:
        "보험다모아 2026-05 quote matrix에서 숫자 월 보험료 4건을 확인했고 교보라이프플래닛 HPDA01S0 공시 문서 hash 3건을 검수했다.",
      monthlyPremiumKrw: 8490,
      premiumText: "8,490원",
      premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
      renewalType: "non_renewable",
      coverageSummary:
        "교보라이프플래닛 표준체 암보험. 일반암, 고액암, 유방암 및 전립선암, 소액암 및 유사암 급부를 DNA 암 위험 key와 매칭한다.",
      exclusionsSummary:
        "90일 보장 제외, 1년 감액, 소액암/유사암 급부 분리, 해약환급금 미지급형, 표준체 기준 상품임을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_STANDARD_DETAILS),
      coverageCaveatsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_STANDARD_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: firstRecommendationSnapshotReviewedAt,
      lastVerifiedAt: firstRecommendationSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_db_direct_medical_202605",
    values: {
      saleStatus: "active",
      saleStatusEvidence:
        "DB손보 공시실 API에서 2026-05 판매중 실손의료비보험 row와 약관/사업방법서/상품요약서 PDF hash 3건을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 6854,
      premiumText: "6,854원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 DB손보 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(DB_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(DB_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: medicalBaselineSnapshotReviewedAt,
      lastVerifiedAt: medicalBaselineSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_kb_direct_medical_202605",
    values: {
      saleStatus: "active",
      saleStatusEvidence:
        "KB손보 공시 문서 match score 1.0 약관 hash와 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 6439,
      premiumText: "6,439원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 KB손보 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건, 고정 PDF URL refresh caveat를 표시한다.",
      coverageDetailsJson: JSON.stringify(KB_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(KB_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: medicalBaselineSnapshotReviewedAt,
      lastVerifiedAt: medicalBaselineSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_samsung_fire_direct_medical_202605",
    values: {
      officialProductUrl: "https://direct.samsungfire.com/mall/PP030404_001.html?pcMode=true",
      saleStatus: "active",
      saleStatusEvidence:
        "삼성화재 다이렉트 상품 상세 페이지가 상품명, 상품약관 링크, 2026년 5월 5세대 실손 출시 근거를 제공하고 realloss.pdf 텍스트에서 2605.1 일반형 조항을 확인했다. 보험다모아 조건별 quote 4건도 검수했다.",
      monthlyPremiumKrw: 7503,
      premiumText: "7,503원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 삼성화재 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(SAMSUNG_FIRE_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(SAMSUNG_FIRE_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: samsungFireMedicalSnapshotReviewedAt,
      lastVerifiedAt: samsungFireMedicalSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_hyundai_direct_medical_202605",
    values: {
      saleStatus: "active",
      saleStatusEvidence:
        "현대해상 공시 문서 match score 1.0 약관 hash와 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 6545,
      premiumText: "6,545원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 현대해상 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 보험료 변동과 재가입 조건을 caveat로 표시한다.",
      coverageDetailsJson: JSON.stringify(HYUNDAI_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(HYUNDAI_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: medicalBaselineSnapshotReviewedAt,
      lastVerifiedAt: medicalBaselineSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_nh_fire_medical_202605",
    values: {
      officialProductUrl: "https://www.nhfire.co.kr/product/retrieveProduct.nhfire?pdtCd=D711117",
      saleStatus: "active",
      saleStatusEvidence:
        "농협손보 공식 상품 페이지의 fnPdtFileDownload 호출에서 약관 PDF endpoint를 추출해 SHA-256을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 5745,
      premiumText: "5,745원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 농협손보 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건, 전환계약용 variant caveat를 표시한다.",
      coverageDetailsJson: JSON.stringify(NH_FIRE_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(NH_FIRE_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: nhFireMedicalSnapshotReviewedAt,
      lastVerifiedAt: nhFireMedicalSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_meritz_direct_medical_202605",
    values: {
      officialProductUrl: "https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do",
      saleStatus: "active",
      saleStatusEvidence:
        "메리츠화재 공식 상품 페이지의 6ADGE PDF 목록 API에서 약관/사업방법서/상품요약서 3건의 SHA-256을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 7103,
      premiumText: "7,103원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 메리츠화재 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건, session-bound PDF citation caveat를 표시한다.",
      coverageDetailsJson: JSON.stringify(MERITZ_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(MERITZ_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: meritzFireMedicalSnapshotReviewedAt,
      lastVerifiedAt: meritzFireMedicalSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_heungkuk_fire_direct_medical_202605",
    values: {
      officialProductUrl: "https://direct.heungkukfire.co.kr/?ccid=0606001007#/CMMOBDPRM4001",
      saleStatus: "active",
      saleStatusEvidence:
        "흥국화재 다이렉트 실손 화면 CMMOBDPRM4001의 downloadFile 호출에서 약관 PDF endpoint를 추출해 SHA-256을 확인했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 8939,
      premiumText: "8,939원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 흥국화재 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 갱신 조건, next suffix 약관 hash refresh caveat를 표시한다.",
      coverageDetailsJson: JSON.stringify(HEUNGKUK_FIRE_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(HEUNGKUK_FIRE_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: heungkukFireMedicalSnapshotReviewedAt,
      lastVerifiedAt: heungkukFireMedicalSnapshotReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_lotte_direct_medical_202605",
    values: {
      officialProductUrl: "https://www.lotteins.co.kr/web/C/D/A/cda020.jsp?prdtseq=11",
      saleStatus: "active",
      saleStatusEvidence:
        "롯데손보 공식 상품 페이지 prdtseq=11의 약관보기 버튼에서 let_care_sil_2605_yak.pdf를 확인해 SHA-256을 hash했고 보험다모아 조건별 quote 4건을 검수했다.",
      monthlyPremiumKrw: 15675,
      premiumText: "15,675원",
      premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
      renewalType: "renewable",
      coverageSummary:
        "질병과 상해 치료비를 폭넓게 보상하는 롯데손보 let:care 실손의료보험 baseline 상품.",
      exclusionsSummary:
        "자기부담금, 급여/비급여, 보장 한도, 통원 한도, 갱신/재가입 조건, 상품요약서/사업방법서 hash 미확보 caveat를 표시한다.",
      coverageDetailsJson: JSON.stringify(LOTTE_DIRECT_MEDICAL_DETAILS),
      coverageCaveatsJson: JSON.stringify(LOTTE_DIRECT_MEDICAL_CAVEATS),
      reviewStatus: "approved",
      reviewedAt: lotteMedicalSnapshotReviewedAt,
      lastVerifiedAt: lotteMedicalSnapshotReviewedAt,
      updatedAt: now,
    },
  },
];

const SOURCE_CATALOG_EXCLUSION_UPDATES: InsuranceProductSourceApproval[] = [
  {
    id: "src_samsung_life_hospital_health_202601",
    values: {
      saleStatusEvidence:
        "공식 통합약관 hash와 보험다모아 대표 보험료는 source catalog에 보존한다. 다만 현재 추천 엔진은 oncology/cardiovascular/metabolic/neurological risk_target과 medical_expense baseline만 지원하며, 이 상품은 입원 건강보험이라 현 coverage_category enum에 맞지 않는다. hospitalization 또는 general_health 카테고리 확장 전까지 추천 snapshot에서 제외한다.",
      coverageSummary:
        "삼성생명 인터넷 입원 건강보험 source catalog 보존 상품. 현재 DNA risk target 또는 medical_expense baseline 추천으로 노출하지 않는다.",
      exclusionsSummary:
        "입원 일당형/건강보험형 보장은 현재 추천 카테고리 밖이다. hospitalization/general_health 정책과 schema/i18n/UI 확장 전까지 상담 AI와 추천 카드에 표시하지 않는다.",
      coverageDetailsJson: JSON.stringify({
        coverage_category: "hospitalization_or_general_health_future_candidate",
        matching_strategy: "manual_future_policy",
        risk_targets: [],
        source_catalog_only: true,
        rejection_reason:
          "current_schema_does_not_support_hospitalization_or_general_health_category",
      }),
      coverageCaveatsJson: JSON.stringify([
        "현재 insurance_products coverage_category enum에 맞지 않아 active 추천 snapshot을 발행하지 않는다.",
        "입원 건강보험은 DNA 질병 risk target과 직접 매칭하지 않고, 향후 hospitalization 또는 general_health baseline 정책이 추가될 때 재검토한다.",
        "조건별 quote matrix가 없어 사용자 나이/성별별 approved quote를 표시할 수 없다.",
      ]),
      reviewStatus: "rejected",
      reviewedAt: samsungLifeHospitalPolicyReviewedAt,
      lastVerifiedAt: samsungLifeHospitalPolicyReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_hanwha_general_direct_medical_202605",
    values: {
      saleStatusEvidence:
        "공식 후보 페이지와 PDF는 접근 가능하지만 페이지/PDF가 한화실손의료보험 갱신형 III/TM 및 2021년 계열 문서로 식별된다. target source는 한화다이렉트실손의료보험 갱신형 V 무배당이므로 version mismatch다. 갱신형 V 공식 문서 endpoint 발견 전까지 추천 snapshot과 quote approval에서 제외한다.",
      coverageSummary:
        "한화손보 실손의료보험 source catalog 차단 상품. target 갱신형 V 공식 문서가 확인되지 않아 medical_expense baseline 추천으로 노출하지 않는다.",
      exclusionsSummary:
        "확보한 공식 PDF hash는 갱신형 III 문서라 target 갱신형 V source에 연결하지 않는다. 관련 보험다모아 quote 4건도 rejected로 내려 추천 UI와 상담 AI 컨텍스트에서 제외한다.",
      coverageDetailsJson: JSON.stringify({
        coverage_category: "medical_expense",
        matching_strategy: "baseline_blocked_variant_mismatch",
        risk_targets: [],
        source_catalog_only: true,
        rejection_reason: "official_document_variant_mismatch_renewal_type_iii_vs_v",
        blocked_document_candidate: {
          source_url: "https://mall.hwgeneralins.com/ins/ltr/meditm_features_01.do",
          document_url: "https://mall.hwgeneralins.com/upload/product/LA02039001.pdf",
          file_hash_sha256: "10ee12c4218099f34df16f195ad0d5eb968750ab2b35fa56b6f93aaeb24f497a",
          observed_product_name: "한화실손의료보험갱신형Ⅲ_TM",
        },
      }),
      coverageCaveatsJson: JSON.stringify([
        "공식 후보 PDF가 target 갱신형 V가 아니라 갱신형 III 문서로 확인되어 source document로 seed하지 않는다.",
        "실손의료보험 세대와 개정 버전은 보장 구조와 보험료 caveat에 직접 영향을 주므로 version mismatch를 허용하지 않는다.",
        "갱신형 V 공식 문서 endpoint를 확보하기 전까지 보험다모아 quote 4건은 추천 보험료로 승인하지 않는다.",
      ]),
      reviewStatus: "rejected",
      reviewedAt: hanwhaGeneralMedicalBlockerReviewedAt,
      lastVerifiedAt: hanwhaGeneralMedicalBlockerReviewedAt,
      updatedAt: now,
    },
  },
  {
    id: "src_shinhan_life_sol_cancer_standard_202605",
    values: {
      saleStatusEvidence:
        "신한라이프 공식 wcms endpoint를 active/historical keyword, active full catalog, historical full catalog 방식으로 재탐색했지만 신한SOL암보험 표준형/일반형 문서 row는 발견되지 않았다. 반환되는 판매중 row는 해약환급금 미지급형 1건뿐이며, 해당 문서 3건은 no-refund source 전용이므로 표준형 source에 재사용하지 않는다.",
      coverageSummary:
        "신한SOL암보험 표준형 source catalog 차단 상품. 일반형 공식 문서 endpoint가 없어 oncology risk_target 추천으로 노출하지 않는다.",
      exclusionsSummary:
        "공식 endpoint가 반환하는 문서는 해약환급금 미지급형 variant이므로 표준형 source에 연결하지 않는다. 관련 보험다모아 quote 4건도 rejected로 내려 추천 UI와 상담 AI 컨텍스트에서 제외한다.",
      coverageDetailsJson: JSON.stringify({
        coverage_category: "oncology",
        matching_strategy: "risk_target_blocked_variant_endpoint_missing",
        risk_targets: ONCOLOGY_RISK_TARGETS,
        source_catalog_only: true,
        rejection_reason: "standard_variant_official_document_endpoint_not_found",
        blocked_variant: {
          returned_product_name: "신한SOL암보험(무배당, 해약환급금 미지급형)",
          blocked_document_owner: "src_shinhan_life_sol_cancer_202601",
          active_rows_scanned: 134,
          historical_rows_scanned: 1775,
        },
      }),
      coverageCaveatsJson: JSON.stringify([
        "공식 endpoint에서 표준형 일반 문서 row가 발견되지 않아 source document로 seed하지 않는다.",
        "해약환급금 미지급형 문서는 이미 no-refund source 전용 근거이므로 표준형 source에 재사용하지 않는다.",
        "표준형 공식 문서 endpoint를 확보하기 전까지 보험다모아 quote 4건은 추천 보험료로 승인하지 않는다.",
      ]),
      reviewStatus: "rejected",
      reviewedAt: shinhanStandardBlockerReviewedAt,
      lastVerifiedAt: shinhanStandardBlockerReviewedAt,
      updatedAt: now,
    },
  },
];

const FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS: InsuranceProductSeed[] = [
  {
    id: "prod_shinhan_life_sol_cancer_no_refund_202601",
    productSourceId: "src_shinhan_life_sol_cancer_202601",
    name: "신한SOL암보험 해약환급금 미지급형",
    provider: "신한라이프생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(6750),
    monthlyPremiumKrw: 6750,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(SHINHAN_NO_REFUND_CANCER_DETAILS),
    coverageCaveatsJson: JSON.stringify(SHINHAN_NO_REFUND_CANCER_CAVEATS),
    sourceCheckedAt: shinhanNoRefundSnapshotReviewedAt,
    primarySourceDocumentId: "doc_shinhan_life_sol_cancer_terms_202601",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_miraeasset_online_cancer_basic_202605",
    productSourceId: "src_miraeasset_online_cancer_basic_202605",
    name: "미래에셋생명 온라인 암보험 기본형",
    provider: "미래에셋생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(4510),
    monthlyPremiumKrw: 4510,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_BASIC_DETAILS),
    coverageCaveatsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_BASIC_CAVEATS),
    sourceCheckedAt: miraeassetLifeCancerSnapshotReviewedAt,
    primarySourceDocumentId: "doc_miraeasset_online_cancer_basic_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_miraeasset_online_cancer_no_refund_202605",
    productSourceId: "src_miraeasset_online_cancer_no_refund_202605",
    name: "미래에셋생명 온라인 암보험 해약환급금이없는유형",
    provider: "미래에셋생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(6490),
    monthlyPremiumKrw: 6490,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_NO_REFUND_DETAILS),
    coverageCaveatsJson: JSON.stringify(MIRAEASSET_LIFE_CANCER_NO_REFUND_CAVEATS),
    sourceCheckedAt: miraeassetLifeCancerSnapshotReviewedAt,
    primarySourceDocumentId: "doc_miraeasset_online_cancer_no_refund_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_hanwha_general_direct_cancer_202604",
    productSourceId: "src_hanwha_general_direct_cancer_202604",
    name: "한화손보 다이렉트 내가고른 암보험",
    provider: "한화손보",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(12204),
    monthlyPremiumKrw: 12204,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(HANWHA_GENERAL_CANCER_DETAILS),
    coverageCaveatsJson: JSON.stringify(HANWHA_GENERAL_CANCER_CAVEATS),
    sourceCheckedAt: hanwhaGeneralCancerSnapshotReviewedAt,
    primarySourceDocumentId: "doc_hanwha_general_direct_cancer_terms_202604",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_db_life_eroun_cancer_202601",
    productSourceId: "src_db_life_eroun_cancer_202601",
    name: "DB생명 e로운 암보험",
    provider: "DB생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(9700),
    monthlyPremiumKrw: 9700,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(DB_LIFE_CANCER_DETAILS),
    coverageCaveatsJson: JSON.stringify(DB_LIFE_CANCER_CAVEATS),
    sourceCheckedAt: dbLifeCancerSnapshotReviewedAt,
    primarySourceDocumentId: "doc_db_life_eroun_cancer_terms_202601",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_tongyang_wooriwon_cancer_202605",
    productSourceId: "src_tongyang_wooriwon_cancer_202605",
    name: "동양생명 우리WON하는실속하나로암보험",
    provider: "동양생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(11000),
    monthlyPremiumKrw: 11000,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(TONGYANG_LIFE_CANCER_DETAILS),
    coverageCaveatsJson: JSON.stringify(TONGYANG_LIFE_CANCER_CAVEATS),
    sourceCheckedAt: tongyangLifeCancerSnapshotReviewedAt,
    primarySourceDocumentId: "doc_tongyang_life_wooriwon_cancer_terms_202603",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_hanwha_life_e_cancer_202604",
    productSourceId: "src_hanwha_life_e_cancer_202604",
    name: "한화생명 e암보험 표준체형",
    provider: "한화생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(10950),
    monthlyPremiumKrw: 10950,
    premiumCurrency: "KRW" as const,
    premiumBasis: HANWHA_LIFE_CARRIER_QUOTE_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(HANWHA_LIFE_CANCER_STANDARD_DETAILS),
    coverageCaveatsJson: JSON.stringify(HANWHA_LIFE_CANCER_STANDARD_CAVEATS),
    sourceCheckedAt: hanwhaLifeQuoteReviewedAt,
    primarySourceDocumentId: "doc_hanwha_life_e_cancer_terms_202604",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_hanwha_life_e_cancer_nonsmoker_202604",
    productSourceId: "src_hanwha_life_e_cancer_nonsmoker_202604",
    name: "한화생명 e암보험 비흡연체형",
    provider: "한화생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(10850),
    monthlyPremiumKrw: 10850,
    premiumCurrency: "KRW" as const,
    premiumBasis: HANWHA_LIFE_CARRIER_QUOTE_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(HANWHA_LIFE_CANCER_NONSMOKER_DETAILS),
    coverageCaveatsJson: JSON.stringify(HANWHA_LIFE_CANCER_NONSMOKER_CAVEATS),
    sourceCheckedAt: hanwhaLifeQuoteReviewedAt,
    primarySourceDocumentId: "doc_hanwha_life_e_cancer_nonsmoker_terms_202604",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_kdb_life_direct_cancer_202605",
    productSourceId: "src_kdb_life_direct_cancer_202605",
    name: "KDB다이렉트 암보험",
    provider: "KDB생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(8020),
    monthlyPremiumKrw: 8020,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(KDB_DIRECT_CANCER_DETAILS),
    coverageCaveatsJson: JSON.stringify(KDB_DIRECT_CANCER_CAVEATS),
    sourceCheckedAt: firstRecommendationSnapshotReviewedAt,
    primarySourceDocumentId: "doc_kdb_life_direct_cancer_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_kyobo_lifeplanet_cancer_nonsmoker_202605",
    productSourceId: "src_kyobo_lifeplanet_cancer_nonsmoker_202605",
    name: "교보라플 비갱신암보험 비흡연체",
    provider: "교보라이프플래닛",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(8410),
    monthlyPremiumKrw: 8410,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_NONSMOKER_DETAILS),
    coverageCaveatsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_NONSMOKER_CAVEATS),
    sourceCheckedAt: firstRecommendationSnapshotReviewedAt,
    primarySourceDocumentId: "doc_kyobo_lifeplanet_cancer_nonsmoker_terms_202604",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_kyobo_lifeplanet_cancer_standard_202605",
    productSourceId: "src_kyobo_lifeplanet_cancer_standard_202605",
    name: "교보라플 비갱신암보험 표준체",
    provider: "교보라이프플래닛",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(8490),
    monthlyPremiumKrw: 8490,
    premiumCurrency: "KRW" as const,
    premiumBasis: FIRST_SNAPSHOT_PREMIUM_BASIS,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(ONCOLOGY_RISK_TARGETS),
    matchingStrategy: "risk_target" as const,
    coverageDetailsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_STANDARD_DETAILS),
    coverageCaveatsJson: JSON.stringify(KYOBOLIFEPLANET_CANCER_STANDARD_CAVEATS),
    sourceCheckedAt: firstRecommendationSnapshotReviewedAt,
    primarySourceDocumentId: "doc_kyobo_lifeplanet_cancer_standard_terms_202604",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_db_direct_medical_202605",
    productSourceId: "src_db_direct_medical_202605",
    name: "DB손보 다이렉트 실손의료비보험",
    provider: "DB손보",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(6854),
    monthlyPremiumKrw: 6854,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(DB_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(DB_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: medicalBaselineSnapshotReviewedAt,
    primarySourceDocumentId: "doc_db_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_kb_direct_medical_202605",
    productSourceId: "src_kb_direct_medical_202605",
    name: "KB손보 다이렉트실손의료비보장보험",
    provider: "KB손보",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(6439),
    monthlyPremiumKrw: 6439,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(KB_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(KB_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: medicalBaselineSnapshotReviewedAt,
    primarySourceDocumentId: "doc_kb_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_samsung_fire_direct_medical_202605",
    productSourceId: "src_samsung_fire_direct_medical_202605",
    name: "삼성화재 다이렉트 실손의료비보험",
    provider: "삼성화재",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(7503),
    monthlyPremiumKrw: 7503,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(SAMSUNG_FIRE_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(SAMSUNG_FIRE_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: samsungFireMedicalSnapshotReviewedAt,
    primarySourceDocumentId: "doc_samsung_fire_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_hyundai_direct_medical_202605",
    productSourceId: "src_hyundai_direct_medical_202605",
    name: "현대해상다이렉트실손의료비보장보험",
    provider: "현대해상",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(6545),
    monthlyPremiumKrw: 6545,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(HYUNDAI_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(HYUNDAI_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: medicalBaselineSnapshotReviewedAt,
    primarySourceDocumentId: "doc_hyundai_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_nh_fire_medical_202605",
    productSourceId: "src_nh_fire_medical_202605",
    name: "농협손보 헤아림실손의료비보험",
    provider: "농협손보",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(5745),
    monthlyPremiumKrw: 5745,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(NH_FIRE_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(NH_FIRE_MEDICAL_CAVEATS),
    sourceCheckedAt: nhFireMedicalSnapshotReviewedAt,
    primarySourceDocumentId: "doc_nh_fire_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_meritz_direct_medical_202605",
    productSourceId: "src_meritz_direct_medical_202605",
    name: "메리츠 다이렉트 실손의료비보험",
    provider: "메리츠화재",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(7103),
    monthlyPremiumKrw: 7103,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(MERITZ_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(MERITZ_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: meritzFireMedicalSnapshotReviewedAt,
    primarySourceDocumentId: "doc_meritz_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_heungkuk_fire_direct_medical_202605",
    productSourceId: "src_heungkuk_fire_direct_medical_202605",
    name: "흥국화재 흥Good 다이렉트 실손의료보험",
    provider: "흥국화재",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(8939),
    monthlyPremiumKrw: 8939,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(HEUNGKUK_FIRE_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(HEUNGKUK_FIRE_MEDICAL_CAVEATS),
    sourceCheckedAt: heungkukFireMedicalSnapshotReviewedAt,
    primarySourceDocumentId: "doc_heungkuk_fire_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
  {
    id: "prod_lotte_direct_medical_202605",
    productSourceId: "src_lotte_direct_medical_202605",
    name: "롯데손보 let:care 실손의료보험",
    provider: "롯데손보",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: toFirstSnapshotUsdc(15675),
    monthlyPremiumKrw: 15675,
    premiumCurrency: "KRW" as const,
    premiumBasis: MEDICAL_BASELINE_PREMIUM_BASIS,
    coverageCategory: "medical_expense" as const,
    riskTargets: JSON.stringify([]),
    matchingStrategy: "baseline" as const,
    coverageDetailsJson: JSON.stringify(LOTTE_DIRECT_MEDICAL_DETAILS),
    coverageCaveatsJson: JSON.stringify(LOTTE_DIRECT_MEDICAL_CAVEATS),
    sourceCheckedAt: lotteMedicalSnapshotReviewedAt,
    primarySourceDocumentId: "doc_lotte_direct_medical_terms_202605",
    catalogStatus: "approved" as const,
    discountEligible: 0,
    originalPremiumUsdc: null,
    isActive: 1,
    createdAt: now,
  },
];

const LEGACY_DEMO_PRODUCT_IDS = [
  "prod_001",
  "prod_002",
  "prod_003",
  "prod_004",
  "prod_005",
];

const ACTIVE_INSURANCE_PRODUCTS: InsuranceProductSeed[] = [
  ...FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS,
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

  console.log("Approving first recommendation snapshot source rows...");
  for (const sourceApproval of FIRST_RECOMMENDATION_SOURCE_APPROVALS) {
    await db
      .update(insuranceProductSources)
      .set(sourceApproval.values)
      .where(eq(insuranceProductSources.id, sourceApproval.id));
  }

  console.log("Marking source catalog exclusions...");
  for (const sourceExclusion of SOURCE_CATALOG_EXCLUSION_UPDATES) {
    await db
      .update(insuranceProductSources)
      .set(sourceExclusion.values)
      .where(eq(insuranceProductSources.id, sourceExclusion.id));
  }

  console.log("Seeding source-aware insurance documents...");
  for (const document of SOURCE_AWARE_DOCUMENTS) {
    await db
      .insert(insuranceSourceDocuments)
      .values(document)
      .onConflictDoNothing();
  }

  console.log("Seeding Hanwha Life carrier quote rows...");
  for (const quote of HANWHA_LIFE_CARRIER_QUOTE_ROWS) {
    await db
      .insert(insurancePremiumQuotes)
      .values(quote)
      .onConflictDoNothing();
  }

  console.log("Rejecting Hanwha Life e-insmarket zero quote rows...");
  await db
    .update(insurancePremiumQuotes)
    .set({ reviewStatus: "rejected" })
    .where(inArray(insurancePremiumQuotes.id, HANWHA_LIFE_ZERO_QUOTE_REJECTED_IDS));

  console.log("Approving recommendation snapshot quote rows...");
  await db
    .update(insurancePremiumQuotes)
    .set({ reviewStatus: "approved" })
    .where(
      inArray(insurancePremiumQuotes.id, [
        ...FIRST_SNAPSHOT_APPROVED_QUOTE_IDS,
        ...HANWHA_LIFE_CARRIER_QUOTE_IDS,
        ...MEDICAL_BASELINE_APPROVED_QUOTE_IDS,
        ...SHINHAN_NO_REFUND_APPROVED_QUOTE_IDS,
        ...MIRAEASSET_LIFE_CANCER_APPROVED_QUOTE_IDS,
        ...HANWHA_GENERAL_CANCER_APPROVED_QUOTE_IDS,
        ...DB_LIFE_CANCER_APPROVED_QUOTE_IDS,
        ...TONGYANG_LIFE_CANCER_APPROVED_QUOTE_IDS,
      ])
    );

  console.log("Rejecting source catalog exclusion quote rows...");
  await db
    .update(insurancePremiumQuotes)
    .set({ reviewStatus: "rejected" })
    .where(inArray(insurancePremiumQuotes.id, SOURCE_CATALOG_EXCLUSION_QUOTE_REJECTED_IDS));

  console.log("Archiving legacy demo insurance products...");
  await db
    .update(insuranceProducts)
    .set({ catalogStatus: "archived", isActive: 0 })
    .where(inArray(insuranceProducts.id, LEGACY_DEMO_PRODUCT_IDS));

  console.log("Seeding active source-backed insurance products...");
  for (const product of ACTIVE_INSURANCE_PRODUCTS) {
    await db
      .insert(insuranceProducts)
      .values(product)
      .onConflictDoNothing();
  }
  console.log(
    `Seed complete. ${SOURCE_AWARE_CARRIERS.length} carriers, ${SOURCE_AWARE_PRODUCT_SOURCES.length} source candidates, ${SOURCE_AWARE_DOCUMENTS.length} documents, ${FIRST_RECOMMENDATION_SOURCE_APPROVALS.length} source approvals, ${SOURCE_CATALOG_EXCLUSION_UPDATES.length} source catalog exclusions, ${HANWHA_LIFE_CARRIER_QUOTE_ROWS.length} Hanwha carrier quotes inserted if missing, ${FIRST_SNAPSHOT_APPROVED_QUOTE_IDS.length + HANWHA_LIFE_CARRIER_QUOTE_IDS.length + MEDICAL_BASELINE_APPROVED_QUOTE_IDS.length + SHINHAN_NO_REFUND_APPROVED_QUOTE_IDS.length + MIRAEASSET_LIFE_CANCER_APPROVED_QUOTE_IDS.length + HANWHA_GENERAL_CANCER_APPROVED_QUOTE_IDS.length + DB_LIFE_CANCER_APPROVED_QUOTE_IDS.length + TONGYANG_LIFE_CANCER_APPROVED_QUOTE_IDS.length} quote approvals, ${HANWHA_LIFE_ZERO_QUOTE_REJECTED_IDS.length} Hanwha zero quotes rejected, ${SOURCE_CATALOG_EXCLUSION_QUOTE_REJECTED_IDS.length} source catalog exclusion quotes rejected, ${LEGACY_DEMO_PRODUCT_IDS.length} legacy demo products archived, and ${ACTIVE_INSURANCE_PRODUCTS.length} active source-backed insurance products checked.`
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
