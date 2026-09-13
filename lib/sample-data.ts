import { REGION_LIST } from "./region-data";
import type { RegionRawInput } from "./types";

/**
 * 국립중앙의료원 공공보건의료지원센터 데모용 샘플 데이터 생성기.
 * 실제 통계가 아닌, 도농(都農) 특성을 반영한 시연용 추정치이며
 * 코드값을 시드로 사용해 실행할 때마다 동일한 결과를 재현한다(결정론적 생성).
 */

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromCode(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return hash;
}

const METRO_SIDO = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
]);

function computeUrbanity(sido: string, name: string): number {
  if (METRO_SIDO.has(sido)) {
    if (name.endsWith("군")) return 0.35;
    return 0.85;
  }
  if (sido === "경기도") {
    if (name.includes("구")) return 0.8;
    if (name.endsWith("시")) return 0.6;
    return 0.3;
  }
  if (sido === "제주특별자치도") {
    return 0.5;
  }
  // 그 외 도 지역
  if (name.includes("구")) return 0.65;
  if (name.endsWith("시")) return 0.45;
  return 0.2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function generateSampleData(): RegionRawInput[] {
  return REGION_LIST.map((region) => {
    const rng = mulberry32(seedFromCode(region.code));
    const jitter = (range: number) => (rng() * 2 - 1) * range;
    const urbanity = computeUrbanity(region.sido, region.name);

    let population: number;
    if (region.sido === "세종특별자치시") {
      population = Math.round(120000 + rng() * 280000);
    } else if (urbanity >= 0.8) {
      population = Math.round(150000 + rng() * 400000);
    } else if (urbanity >= 0.55) {
      population = Math.round(60000 + rng() * 250000);
    } else if (urbanity >= 0.4) {
      population = Math.round(30000 + rng() * 150000);
    } else {
      population = Math.round(8000 + rng() * 65000);
    }

    // 도농 격차를 뚜렷하게 반영하기 위해 (1-urbanity)에 지수(1.5)를 적용해
    // 대도시는 급격히 안전해지고 농어촌 지역만 임계값을 크게 초과하도록 설계.
    const rurality = Math.pow(1 - urbanity, 1.5);
    const emergencyUncovered60 = clamp(rurality * 50 + jitter(6), 0, 96);
    const emergencyRI = clamp(15 + urbanity * 70 + jitter(7), 4, 97);
    const deliveryUncovered60 = clamp(rurality * 55 + jitter(6), 0, 97);
    const deliveryInfraIndex = clamp(10 + urbanity * 85 + jitter(8), 3, 100);
    const pediatricAccessIndex = clamp(15 + urbanity * 80 + jitter(7), 4, 100);
    const pediatricBedRatio = clamp(10 + urbanity * 95 + jitter(9), 3, 135);

    const row: RegionRawInput = {
      sidoCode: region.sidoCode,
      sidoName: region.sido,
      sigunguCode: region.code,
      sigunguName: region.name,
      population,
      emergencyUncovered60: Number(emergencyUncovered60.toFixed(1)),
      emergencyRI: Number(emergencyRI.toFixed(1)),
      deliveryUncovered60: Number(deliveryUncovered60.toFixed(1)),
      deliveryInfraIndex: Number(deliveryInfraIndex.toFixed(1)),
      pediatricAccessIndex: Number(pediatricAccessIndex.toFixed(1)),
      pediatricBedRatio: Number(pediatricBedRatio.toFixed(1)),
    };
    return row;
  });
}
