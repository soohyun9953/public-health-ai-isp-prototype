import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AMBIGUOUS_REGION_NAMES, findRegionByNameOrCode, findRegionBySidoAndName } from "./region-data";
import { isNmcWorkbook, parseNmcWorkbook } from "./parse-nmc-workbook";
import type { ColumnMappingResult, IndicatorKey, RegionRawInput } from "./types";

type FieldKey =
  | "sidoCode"
  | "sidoName"
  | "sigunguCode"
  | "sigunguName"
  | "population"
  | IndicatorKey;

// 우선순위가 높은(더 구체적인) 필드부터 매칭을 시도해 컬럼명 충돌을 방지한다.
// 각 항목은 헤더에 모든 키워드가 포함되어야 매칭되는 AND 조건이다.
const FIELD_KEYWORD_GROUPS: { field: FieldKey; anyOf: string[][] }[] = [
  { field: "pediatricSpecialistRate", anyOf: [["소아", "전문의"]] },
  { field: "pediatricRI", anyOf: [["소아", "이용률"], ["소아", "RI"]] },
  { field: "deliveryFacilityRate", anyOf: [["분만", "기관"]] },
  { field: "deliveryRI", anyOf: [["분만", "이용률"], ["분만", "RI"]] },
  { field: "emergencyTransferRate", anyOf: [["전원율"], ["응급", "전원"]] },
  { field: "emergencyRI", anyOf: [["응급", "이용률"], ["응급", "RI"]] },
  { field: "population", anyOf: [["인구수"], ["인구"]] },
  { field: "sigunguCode", anyOf: [["시군구코드"], ["행정코드"], ["지역코드"]] },
  { field: "sigunguName", anyOf: [["시군구명"], ["시군구"], ["지역명"], ["지역"]] },
  { field: "sidoCode", anyOf: [["시도코드"]] },
  { field: "sidoName", anyOf: [["시도명"], ["시도"], ["광역시도"]] },
];

function autoMapColumns(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  const claimed = new Set<string>();

  for (const { field, anyOf } of FIELD_KEYWORD_GROUPS) {
    const match = headers.find((h) => {
      if (claimed.has(h)) return false;
      const lower = h.toLowerCase();
      return anyOf.some((group) => group.every((term) => lower.includes(term.toLowerCase())));
    });
    if (match) {
      mapping[field] = match;
      claimed.add(match);
    }
  }
  return mapping;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const cleaned = trimmed.replace(/[,%\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const INDICATOR_FIELDS: IndicatorKey[] = [
  "emergencyRI",
  "emergencyTransferRate",
  "deliveryRI",
  "deliveryFacilityRate",
  "pediatricRI",
  "pediatricSpecialistRate",
];

function buildRowsFromRecords(records: Record<string, unknown>[]): ColumnMappingResult {
  const warnings: string[] = [];
  const unmatchedRegionNames: string[] = [];

  if (records.length === 0) {
    return { rows: [], unmatchedRegionNames, warnings: ["업로드된 파일에 데이터 행이 없습니다."] };
  }

  const headers = Object.keys(records[0]).map((h) => h.trim());
  const mapping = autoMapColumns(headers);

  if (!mapping.sigunguName && !mapping.sigunguCode) {
    warnings.push(
      "시군구명 또는 시군구코드 컬럼을 찾지 못했습니다. '표준 템플릿'의 헤더 형식을 확인해 주세요."
    );
  }

  const rows: RegionRawInput[] = [];
  let ambiguousWithoutSidoCount = 0;

  for (const record of records) {
    const rawNameOrCode =
      (mapping.sigunguName ? String(record[mapping.sigunguName] ?? "").trim() : "") ||
      (mapping.sigunguCode ? String(record[mapping.sigunguCode] ?? "").trim() : "");

    if (!rawNameOrCode) continue;

    const rawSido =
      (mapping.sidoName ? String(record[mapping.sidoName] ?? "").trim() : "") ||
      (mapping.sidoCode ? String(record[mapping.sidoCode] ?? "").trim() : "");

    // "중구", "동구"처럼 여러 시·도에 동시에 존재하는 지역명은 시도 정보 없이는
    // 어느 지역인지 특정할 수 없으므로, 시도 컬럼이 있으면 반드시 함께 사용한다.
    const geo = rawSido
      ? findRegionBySidoAndName(rawSido, rawNameOrCode)
      : findRegionByNameOrCode(rawNameOrCode);

    if (!geo) {
      unmatchedRegionNames.push(rawSido ? `${rawSido} ${rawNameOrCode}` : rawNameOrCode);
      continue;
    }
    if (!rawSido && AMBIGUOUS_REGION_NAMES.has(rawNameOrCode)) {
      ambiguousWithoutSidoCount += 1;
    }

    const missingIndicators: IndicatorKey[] = [];
    const indicatorValues: Record<IndicatorKey, number> = {
      emergencyRI: 0,
      emergencyTransferRate: 0,
      deliveryRI: 0,
      deliveryFacilityRate: 0,
      pediatricRI: 0,
      pediatricSpecialistRate: 0,
    };
    for (const key of INDICATOR_FIELDS) {
      const column = mapping[key];
      const value = column ? toNumberOrNull(record[column]) : null;
      if (value === null) {
        missingIndicators.push(key);
        indicatorValues[key] = 0;
      } else {
        indicatorValues[key] = value;
      }
    }

    const populationValue = mapping.population ? toNumberOrNull(record[mapping.population]) : null;

    rows.push({
      sidoCode: geo.sidoCode,
      sidoName: geo.sido,
      sigunguCode: geo.code,
      sigunguName: geo.name,
      population: populationValue ?? 0,
      ...indicatorValues,
      missingIndicators,
    });
  }

  if (unmatchedRegionNames.length > 0) {
    warnings.push(
      `${unmatchedRegionNames.length}건의 행정구역명을 전국 시·군·구 목록과 매칭하지 못해 제외했습니다.`
    );
  }
  if (ambiguousWithoutSidoCount > 0) {
    warnings.push(
      `${ambiguousWithoutSidoCount}건은 "중구", "동구"처럼 여러 시·도에 동시에 존재하는 지역명인데 시도명 컬럼이 없어 정확한 지역을 특정하지 못했을 수 있습니다. 표준 템플릿의 '시도명' 컬럼을 함께 입력해 주세요.`
    );
  }

  return { rows, unmatchedRegionNames, warnings };
}

export async function parseUploadedFile(file: File): Promise<ColumnMappingResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return buildRowsFromRecords(parsed.data);
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // 국립중앙의료원이 배포하는 원본 통계집(다중 시트 + 병합 헤더)은
    // 표준 템플릿과 구조가 전혀 달라 전용 파서로 라우팅한다.
    if (isNmcWorkbook(workbook)) {
      return parseNmcWorkbook(workbook);
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return buildRowsFromRecords(records);
  }

  return {
    rows: [],
    unmatchedRegionNames: [],
    warnings: ["지원하지 않는 파일 형식입니다. CSV 또는 XLSX 파일을 업로드해 주세요."],
  };
}
