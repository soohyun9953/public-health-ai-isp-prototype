// 필수의료 취약지 진단 플랫폼 - 핵심 도메인 타입 정의
// 지표 체계: 국립중앙의료원 「2024 지역별 공공보건의료 통계」 실측 지표 기준

export type VulnerabilityGrade = "safe" | "caution" | "vulnerable" | "critical";

export type IndicatorKey =
  | "emergencyRI"
  | "emergencyTransferRate"
  | "deliveryRI"
  | "deliveryFacilityRate"
  | "pediatricRI"
  | "pediatricSpecialistRate";

export interface RegionRawInput {
  sidoCode: string;
  sidoName: string;
  sigunguCode: string;
  sigunguName: string;
  population: number;
  /** 중증응급환자 응급의료서비스 관내의료이용률 RI (%, 2024) */
  emergencyRI: number;
  /** 중증응급환자 전원율 (%, 2024) */
  emergencyTransferRate: number;
  /** 분만 입원서비스 관내의료이용률 RI (%, 2024) */
  deliveryRI: number;
  /** 분만가능기관 수 (개소, 출생아 1천명당, 2024) */
  deliveryFacilityRate: number;
  /** 소아청소년입원 관내의료이용률 RI (%, 2024) */
  pediatricRI: number;
  /** 소아청소년과 전문의 수 (명, 만19세미만인구 10만명당, 2024) */
  pediatricSpecialistRate: number;
  /** 실적 부족 등으로 통계 산출이 불가능했던 지표 목록 (해당 지표는 0으로 대체되어 있음) */
  missingIndicators: IndicatorKey[];
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
  emergencyRI: number;
  emergencyTransferRate: number;
  deliveryRI: number;
  deliveryFacilityRate: number;
  pediatricRI: number;
  pediatricSpecialistRate: number;
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
