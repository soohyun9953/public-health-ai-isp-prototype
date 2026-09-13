// 필수의료 취약지 진단 플랫폼 - 핵심 도메인 타입 정의

export type VulnerabilityGrade = "safe" | "caution" | "vulnerable" | "critical";

export interface RegionRawInput {
  sidoCode: string;
  sidoName: string;
  sigunguCode: string;
  sigunguName: string;
  population: number;
  /** 권역응급의료센터 60분 내 미도달 인구 비율 (%) */
  emergencyUncovered60: number;
  /** 관내 중증응급환자 의료이용률 RI (%) */
  emergencyRI: number;
  /** 분만실(산부인과) 60분 내 미도달 인구 비율 (%) */
  deliveryUncovered60: number;
  /** 가임기 여성 인구 대비 분만 인프라 지수 (%) */
  deliveryInfraIndex: number;
  /** 소아청소년과 야간·휴일 진료 접근성 지수 (%, 시도 평균 대비) */
  pediatricAccessIndex: number;
  /** 기준 병상 대비 소아 병상 공급 비율 (%) */
  pediatricBedRatio: number;
}

export interface RegionAnalysis extends RegionRawInput {
  isEmergencyVulnerable: boolean;
  isDeliveryVulnerable: boolean;
  isPediatricVulnerable: boolean;
  vulnerableCount: number;
  grade: VulnerabilityGrade;
}

export interface NationalStats {
  population: number;
  emergencyUncovered60: number;
  emergencyRI: number;
  deliveryUncovered60: number;
  deliveryInfraIndex: number;
  pediatricAccessIndex: number;
  pediatricBedRatio: number;
}

export interface RegionGeoMeta {
  code: string;
  name: string;
  sidoCode: string;
  sido: string;
}

export interface ColumnMappingResult {
  rows: RegionRawInput[];
  unmatchedRegionNames: string[];
  warnings: string[];
}
