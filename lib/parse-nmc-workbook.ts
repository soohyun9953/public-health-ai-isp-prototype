import * as XLSX from "xlsx";
import { findRegionBySidoAndName, normalizeSidoName } from "./region-data";
import type { ColumnMappingResult, IndicatorKey, RegionRawInput } from "./types";

/**
 * 국립중앙의료원 「지역별 공공보건의료 통계」 원본 통계집(다중 시트, 병합 헤더) 전용 파서.
 *
 * 이 원자료는 "표준 템플릿"과 전혀 다른 구조(연도별 다단 헤더 + 시도/중진료권/시군구 3단
 * 집계 + 12개 시트)를 가지므로, 시군구명 컬럼처럼 보이는 셀을 단순 매핑하는 표준 파서로는
 * 처리할 수 없다. 대신 지표 시트를 이름 패턴으로 찾고, 헤더를 동적으로 재구성해 지표번호로
 * 필요한 컬럼을 찾아낸다. 매년 새로운 연도 컬럼이 추가되어도(예: 2025년) "가장 최신 연도"를
 * 자동으로 선택하므로 파일 구조가 크게 바뀌지 않는 한 그대로 재사용할 수 있다.
 */

const SHEET_NAME_PATTERNS = {
  population: /^1-1\./,
  emergency: /^2-1\./,
  delivery: /^2-3\./,
  pediatric: /^2-4\./,
} as const;

const SPECIAL_NAME_MAP: Record<string, string> = {
  미추홀구: "남구",
  세종특별자치시: "세종시",
};

export function isNmcWorkbook(workbook: XLSX.WorkBook): boolean {
  return Object.values(SHEET_NAME_PATTERNS).every((re) =>
    workbook.SheetNames.some((name) => re.test(name))
  );
}

function findSheetName(workbook: XLSX.WorkBook, re: RegExp): string | null {
  return workbook.SheetNames.find((n) => re.test(n)) ?? null;
}

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function sheetToGrid(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

function maxWidth(grid: unknown[][]): number {
  let w = 0;
  for (const row of grid) if (row.length > w) w = row.length;
  return w;
}

/** 통계 시트는 A열이 "전국"인 행부터가 실제 데이터이고, 그 위가 전부 다단 헤더다. */
function findDataStartRow(grid: unknown[][]): number {
  for (let i = 0; i < grid.length; i++) {
    if (cellText(grid[i]?.[0]) === "전국") return i;
  }
  return -1;
}

/** 각 컬럼의 헤더 경로를 위→아래 forward-fill 후 중복 제거해 하나의 문자열로 합친다. */
function buildColumnPaths(grid: unknown[][], dataStartRow: number, width: number): string[] {
  const headerRows = grid.slice(0, dataStartRow);
  const filledRows: string[][] = headerRows.map((row) => {
    const out: string[] = [];
    let last = "";
    for (let c = 0; c < width; c++) {
      const t = cellText(row[c]);
      if (t) last = t;
      out.push(last);
    }
    return out;
  });

  const paths: string[] = [];
  for (let c = 0; c < width; c++) {
    const parts: string[] = [];
    const seen = new Set<string>();
    for (const filledRow of filledRows) {
      const v = filledRow[c];
      if (v && !seen.has(v)) {
        seen.add(v);
        parts.push(v);
      }
    }
    paths.push(parts.join(" | "));
  }
  return paths;
}

/**
 * 지표번호(예: 26)와 반드시 포함해야 하는 서브카테고리 키워드로 컬럼을 찾고,
 * 후보가 여러 연도에 걸쳐 있으면 그중 가장 최신 연도의 컬럼을 선택한다.
 */
function findLatestColumn(
  paths: string[],
  indicatorNo: number,
  subcategoryMustInclude: string[]
): number | null {
  const pattern = new RegExp(`(^|\\|)\\s*${indicatorNo}\\.\\s`);
  let bestCol: number | null = null;
  let bestYear = -1;
  for (let col = 0; col < paths.length; col++) {
    const path = paths[col];
    if (!pattern.test(path)) continue;
    if (!subcategoryMustInclude.every((s) => path.includes(s))) continue;
    const years = [...path.matchAll(/20\d{2}/g)].map((m) => parseInt(m[0], 10));
    if (years.length === 0) continue;
    const year = Math.max(...years);
    if (bestCol === null || year > bestYear) {
      bestCol = col;
      bestYear = year;
    }
  }
  return bestCol;
}

function cellNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === "" || s === "a" || s === "b" || s === "-") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

interface SigunguEntry {
  sidoRaw: string;
  sigunguRaw: string;
  row: unknown[];
}

/** "시군구\n(250개)" 마커가 등장한 행부터, 시도/시군구 값이 모두 빈 행이 나올 때까지가 시군구 블록이다. */
function extractSigunguBlock(grid: unknown[][]): SigunguEntry[] {
  const out: SigunguEntry[] = [];
  let started = false;
  for (const row of grid) {
    const a = cellText(row[0]);
    if (a.startsWith("시군구")) started = true;
    if (!started) continue;
    const sido = cellText(row[1]);
    const sigungu = cellText(row[2]);
    if (!sido && !sigungu) break;
    out.push({ sidoRaw: sido, sigunguRaw: sigungu, row });
  }
  return out;
}

function normalizeRegionName(raw: string): string {
  const stripped = raw.replace(/\([^)]*\)/g, "").trim().replace(/\s+/g, "");
  return SPECIAL_NAME_MAP[stripped] ?? stripped;
}

/**
 * "시도::시군구명" 복합키로 맵을 구성한다. 시도 구분 없이 시군구명만으로 키를 만들면
 * 중구/동구/서구/남구/북구/강서구/고성군처럼 여러 시·도에 동시에 존재하는 지역이
 * 서로를 덮어써 데이터가 유실된다(실제로 이 버그로 23개 시·군·구가 누락된 적이 있다).
 */
function buildRegionMap(entries: SigunguEntry[]): Map<string, unknown[]> {
  const map = new Map<string, unknown[]>();
  for (const e of entries) {
    // "군위군(~'23)"처럼 행정구역 개편 이전 레코드는 제외하고 현재 소속("('24~)") 값만 사용한다.
    if (e.sigunguRaw.includes("~'23") || e.sigunguRaw.includes("~23")) continue;
    const normName = normalizeRegionName(e.sigunguRaw);
    if (!normName) continue;
    const normSido = normalizeSidoName(e.sidoRaw.replace(/\([^)]*\)/g, "").trim());
    map.set(`${normSido}::${normName}`, e.row);
  }
  return map;
}

export function parseNmcWorkbook(workbook: XLSX.WorkBook): ColumnMappingResult {
  const warnings: string[] = [];

  const popSheetName = findSheetName(workbook, SHEET_NAME_PATTERNS.population);
  const emgSheetName = findSheetName(workbook, SHEET_NAME_PATTERNS.emergency);
  const matSheetName = findSheetName(workbook, SHEET_NAME_PATTERNS.delivery);
  const pedSheetName = findSheetName(workbook, SHEET_NAME_PATTERNS.pediatric);

  if (!popSheetName || !emgSheetName || !matSheetName || !pedSheetName) {
    return {
      rows: [],
      unmatchedRegionNames: [],
      warnings: [
        "국립중앙의료원 통계 원본 파일 형식으로 인식했지만, 필요한 시트(1-1 전체입원/2-1 중증응급/2-3 산모/2-4 어린이)를 모두 찾지 못했습니다.",
      ],
    };
  }

  const popGrid = sheetToGrid(workbook.Sheets[popSheetName]);
  const emgGrid = sheetToGrid(workbook.Sheets[emgSheetName]);
  const matGrid = sheetToGrid(workbook.Sheets[matSheetName]);
  const pedGrid = sheetToGrid(workbook.Sheets[pedSheetName]);

  const popDataStart = findDataStartRow(popGrid);
  const emgDataStart = findDataStartRow(emgGrid);
  const matDataStart = findDataStartRow(matGrid);
  const pedDataStart = findDataStartRow(pedGrid);

  if ([popDataStart, emgDataStart, matDataStart, pedDataStart].some((i) => i < 0)) {
    return {
      rows: [],
      unmatchedRegionNames: [],
      warnings: ["시트 헤더 구조를 해석하지 못했습니다. 원본 파일의 양식이 변경되었을 수 있습니다."],
    };
  }

  const popPaths = buildColumnPaths(popGrid, popDataStart, maxWidth(popGrid));
  const emgPaths = buildColumnPaths(emgGrid, emgDataStart, maxWidth(emgGrid));
  const matPaths = buildColumnPaths(matGrid, matDataStart, maxWidth(matGrid));
  const pedPaths = buildColumnPaths(pedGrid, pedDataStart, maxWidth(pedGrid));

  const colPop = findLatestColumn(popPaths, 1, ["전체"]);
  const colEmgRI = findLatestColumn(emgPaths, 26, ["전체", "중증응급질환"]);
  const colEmgTransfer = findLatestColumn(emgPaths, 24, ["전체", "중증응급질환"]);
  const colMatRI = findLatestColumn(matPaths, 58, []);
  const colMatFacility = findLatestColumn(matPaths, 52, []);
  const colPedRI = findLatestColumn(pedPaths, 80, []);
  const colPedSpecialist = findLatestColumn(pedPaths, 78, []);

  const missingCols: string[] = [];
  if (colPop === null) missingCols.push("인구수(#1)");
  if (colEmgRI === null) missingCols.push("응급 관내이용률(#26)");
  if (colEmgTransfer === null) missingCols.push("응급 전원율(#24)");
  if (colMatRI === null) missingCols.push("분만 관내이용률(#58)");
  if (colMatFacility === null) missingCols.push("분만가능기관수(#52)");
  if (colPedRI === null) missingCols.push("소아 관내이용률(#80)");
  if (colPedSpecialist === null) missingCols.push("소아전문의수(#78)");
  if (missingCols.length > 0) {
    warnings.push(
      `다음 지표의 컬럼을 찾지 못해 0으로 처리했습니다: ${missingCols.join(", ")}. 원본 파일의 지표 구성이 변경되었을 수 있습니다.`
    );
  }

  const popMap = buildRegionMap(extractSigunguBlock(popGrid));
  const emgMap = buildRegionMap(extractSigunguBlock(emgGrid));
  const matMap = buildRegionMap(extractSigunguBlock(matGrid));
  const pedMap = buildRegionMap(extractSigunguBlock(pedGrid));

  const allCompositeKeys = new Set<string>([
    ...popMap.keys(),
    ...emgMap.keys(),
    ...matMap.keys(),
    ...pedMap.keys(),
  ]);

  const rows: RegionRawInput[] = [];
  const unmatchedRegionNames: string[] = [];
  const usedCodes = new Set<string>();

  for (const key of allCompositeKeys) {
    const sepIndex = key.indexOf("::");
    const sido = key.slice(0, sepIndex);
    const name = key.slice(sepIndex + 2);

    const geo = findRegionBySidoAndName(sido, name);
    if (!geo) {
      unmatchedRegionNames.push(`${sido} ${name}`);
      continue;
    }
    if (usedCodes.has(geo.code)) continue;
    usedCodes.add(geo.code);

    const popRow = popMap.get(key);
    const emgRow = emgMap.get(key);
    const matRow = matMap.get(key);
    const pedRow = pedMap.get(key);

    const population = popRow && colPop !== null ? cellNumberOrNull(popRow[colPop]) : null;
    const emergencyRI = emgRow && colEmgRI !== null ? cellNumberOrNull(emgRow[colEmgRI]) : null;
    const emergencyTransferRate =
      emgRow && colEmgTransfer !== null ? cellNumberOrNull(emgRow[colEmgTransfer]) : null;
    const deliveryRI = matRow && colMatRI !== null ? cellNumberOrNull(matRow[colMatRI]) : null;
    const deliveryFacilityRate =
      matRow && colMatFacility !== null ? cellNumberOrNull(matRow[colMatFacility]) : null;
    const pediatricRI = pedRow && colPedRI !== null ? cellNumberOrNull(pedRow[colPedRI]) : null;
    const pediatricSpecialistRate =
      pedRow && colPedSpecialist !== null ? cellNumberOrNull(pedRow[colPedSpecialist]) : null;

    const missingIndicators: IndicatorKey[] = [];
    if (emergencyRI === null) missingIndicators.push("emergencyRI");
    if (emergencyTransferRate === null) missingIndicators.push("emergencyTransferRate");
    if (deliveryRI === null) missingIndicators.push("deliveryRI");
    if (deliveryFacilityRate === null) missingIndicators.push("deliveryFacilityRate");
    if (pediatricRI === null) missingIndicators.push("pediatricRI");
    if (pediatricSpecialistRate === null) missingIndicators.push("pediatricSpecialistRate");

    rows.push({
      sidoCode: geo.sidoCode,
      sidoName: geo.sido,
      sigunguCode: geo.code,
      sigunguName: geo.name,
      population: population ?? 0,
      emergencyRI: emergencyRI ?? 0,
      emergencyTransferRate: emergencyTransferRate ?? 0,
      deliveryRI: deliveryRI ?? 0,
      deliveryFacilityRate: deliveryFacilityRate ?? 0,
      pediatricRI: pediatricRI ?? 0,
      pediatricSpecialistRate: pediatricSpecialistRate ?? 0,
      missingIndicators,
    });
  }

  if (unmatchedRegionNames.length > 0) {
    warnings.push(
      `${unmatchedRegionNames.length}건의 행정구역명을 전국 시·군·구 목록과 매칭하지 못해 제외했습니다.`
    );
  }

  return { rows, unmatchedRegionNames, warnings };
}
