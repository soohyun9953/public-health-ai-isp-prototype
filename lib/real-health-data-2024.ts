import rawData from "./real-health-data-2024.json";
import type { IndicatorKey, RegionRawInput } from "./types";

interface RawRecord {
  sidoCode: string;
  sidoName: string;
  sigunguCode: string;
  sigunguName: string;
  population: number;
  emergencyRI: number | null;
  emergencyTransferRate: number | null;
  deliveryRI: number | null;
  deliveryFacilityRate: number | null;
  pediatricRI: number | null;
  pediatricSpecialistRate: number | null;
}

const INDICATOR_KEYS: IndicatorKey[] = [
  "emergencyRI",
  "emergencyTransferRate",
  "deliveryRI",
  "deliveryFacilityRate",
  "pediatricRI",
  "pediatricSpecialistRate",
];

/**
 * 국립중앙의료원 「2024 지역별 공공보건의료 통계」 실측 데이터를 로드한다.
 * 해당 서비스 이용/제공 실적이 없어 지표 산출이 불가능했던 시·군·구는
 * 값을 0으로 대체하고 missingIndicators에 표시한다(=취약 판정에 보수적으로 반영).
 */
export function loadRealHealthData2024(): RegionRawInput[] {
  return (rawData as RawRecord[]).map((r) => {
    const missingIndicators: IndicatorKey[] = INDICATOR_KEYS.filter(
      (key) => r[key] === null
    );

    return {
      sidoCode: r.sidoCode,
      sidoName: r.sidoName,
      sigunguCode: r.sigunguCode,
      sigunguName: r.sigunguName,
      population: r.population,
      emergencyRI: r.emergencyRI ?? 0,
      emergencyTransferRate: r.emergencyTransferRate ?? 0,
      deliveryRI: r.deliveryRI ?? 0,
      deliveryFacilityRate: r.deliveryFacilityRate ?? 0,
      pediatricRI: r.pediatricRI ?? 0,
      pediatricSpecialistRate: r.pediatricSpecialistRate ?? 0,
      missingIndicators,
    };
  });
}

export const DATA_SOURCE_LABEL = "국립중앙의료원, 「2024 지역별 공공보건의료 통계」 (2024년 기준)";
