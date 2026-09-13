import regionListJson from "./region-list.json";
import type { RegionGeoMeta } from "./types";

/** 전국 250개 시·군·구 코드/명칭/시도 메타데이터 (통계청 2018 행정경계 기준 코드) */
export const REGION_LIST: RegionGeoMeta[] = regionListJson as RegionGeoMeta[];

export const REGION_BY_CODE: Map<string, RegionGeoMeta> = new Map(
  REGION_LIST.map((r) => [r.code, r])
);

export const REGION_BY_NAME: Map<string, RegionGeoMeta> = new Map(
  REGION_LIST.map((r) => [r.name, r])
);

export const SIDO_LIST: string[] = Array.from(
  new Set(REGION_LIST.map((r) => r.sido))
);

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
