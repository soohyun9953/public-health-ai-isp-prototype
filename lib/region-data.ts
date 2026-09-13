import regionListJson from "./region-list.json";
import type { RegionGeoMeta } from "./types";

/** 전국 250개 시·군·구 코드/명칭/시도 메타데이터 (통계청 2018 행정경계 기준 코드) */
export const REGION_LIST: RegionGeoMeta[] = regionListJson as RegionGeoMeta[];

export const REGION_BY_CODE: Map<string, RegionGeoMeta> = new Map(
  REGION_LIST.map((r) => [r.code, r])
);

/**
 * ⚠️ 이름만으로는 지역을 유일하게 특정할 수 없다 — "중구"(서울/부산/대구/인천/대전/울산),
 * "동구"(부산/대구/인천/광주/대전/울산), "서구"(부산/대구/인천/광주/대전), "남구"(부산/대구/
 * 인천/광주/울산), "북구"(부산/대구/광주/울산), "강서구"(서울/부산), "고성군"(강원/경남)처럼
 * 여러 시·도에 동명 시·군·구가 존재한다. 이 맵은 이름이 유일한 경우의 폴백 용도로만 쓰고,
 * 실제 매칭에는 반드시 findRegionBySidoAndName을 우선 사용해야 한다.
 */
export const REGION_BY_NAME: Map<string, RegionGeoMeta> = new Map(
  REGION_LIST.map((r) => [r.name, r])
);

export const SIDO_LIST: string[] = Array.from(
  new Set(REGION_LIST.map((r) => r.sido))
);

const NAME_COUNT = new Map<string, number>();
for (const r of REGION_LIST) {
  NAME_COUNT.set(r.name, (NAME_COUNT.get(r.name) ?? 0) + 1);
}
/** 여러 시·도에 동시에 존재하는(이름만으로 특정 불가능한) 시·군·구명 집합 */
export const AMBIGUOUS_REGION_NAMES: Set<string> = new Set(
  [...NAME_COUNT.entries()].filter(([, count]) => count > 1).map(([name]) => name)
);

// 2018년 topojson 행정구역 기준(REGION_LIST)과 이후 개편된 공식 명칭이 달라진 시·도를
// 같은 키로 취급하기 위한 별칭 테이블. (강원도 → 강원특별자치도 2023.6, 전라북도 → 전북특별자치도 2024.1)
const SIDO_ALIASES: Record<string, string> = {
  강원도: "강원특별자치도",
  전라북도: "전북특별자치도",
};

export function normalizeSidoName(sido: string): string {
  const trimmed = sido.trim();
  return SIDO_ALIASES[trimmed] ?? trimmed;
}

function sidoCompositeKey(sido: string, name: string): string {
  return `${normalizeSidoName(sido)}::${name}`;
}

export const REGION_BY_SIDO_AND_NAME: Map<string, RegionGeoMeta> = new Map(
  REGION_LIST.map((r) => [sidoCompositeKey(r.sido, r.name), r])
);

/**
 * 시도명(또는 시도코드)과 시군구명을 함께 사용해 지역을 특정한다.
 * 동명 시·군·구(중구/동구/서구/남구/북구/강서구/고성군 등)를 정확히 구분하려면
 * 반드시 이 함수를 사용해야 하며, findRegionByNameOrCode(시군구명 단독)는
 * 이런 지역에서 항상 같은 하나의 지역만 반환하므로 사용하면 안 된다.
 */
export function findRegionBySidoAndName(
  sidoNameOrCode: string,
  sigunguNameOrCode: string
): RegionGeoMeta | undefined {
  const name = sigunguNameOrCode.trim();
  const sido = sidoNameOrCode.trim();

  if (REGION_BY_CODE.has(name)) return REGION_BY_CODE.get(name);

  const bySidoCode = REGION_LIST.find((r) => r.sidoCode === sido && r.name === name);
  if (bySidoCode) return bySidoCode;

  const key = sidoCompositeKey(sido, name);
  if (REGION_BY_SIDO_AND_NAME.has(key)) return REGION_BY_SIDO_AND_NAME.get(key);

  // 시도 표기가 축약형(예: "서울", "부산")이거나 표기가 달라 완전일치하지 않는 경우,
  // 정규화된 시도명이 서로를 포함하는지로 한 번 더 시도한다.
  const normalizedSido = normalizeSidoName(sido);
  const bySidoContains = REGION_LIST.find(
    (r) =>
      r.name === name &&
      (normalizeSidoName(r.sido).includes(normalizedSido) ||
        normalizedSido.includes(normalizeSidoName(r.sido)))
  );
  if (bySidoContains) return bySidoContains;

  // 시도 정보로 특정하지 못했고, 이름 자체가 유일하다면 그 지역으로 폴백한다.
  if (!AMBIGUOUS_REGION_NAMES.has(name)) {
    return findRegionByNameOrCode(name);
  }

  return undefined;
}

export function findRegionByNameOrCode(nameOrCode: string): RegionGeoMeta | undefined {
  const trimmed = nameOrCode.trim();
  if (REGION_BY_CODE.has(trimmed)) return REGION_BY_CODE.get(trimmed);
  if (REGION_BY_NAME.has(trimmed)) return REGION_BY_NAME.get(trimmed);
  // 부분/유사 명칭 매칭 (예: "수원시" -> "수원시장안구" 등 하위 행정구가 있는 경우 첫 매치)
  const partial = REGION_LIST.find(
    (r) => r.name.startsWith(trimmed) || trimmed.startsWith(r.name)
  );
  return partial;
}
