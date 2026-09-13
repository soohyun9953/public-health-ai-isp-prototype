import Papa from "papaparse";
import * as XLSX from "xlsx";
import { findRegionByNameOrCode } from "./region-data";
import type { ColumnMappingResult, RegionRawInput } from "./types";

type FieldKey =
  | "sidoCode"
  | "sidoName"
  | "sigunguCode"
  | "sigunguName"
  | "population"
  | "emergencyUncovered60"
  | "emergencyRI"
  | "deliveryUncovered60"
  | "deliveryInfraIndex"
  | "pediatricAccessIndex"
  | "pediatricBedRatio";

// 우선순위가 높은(더 구체적인) 필드부터 매칭을 시도해 컬럼명 충돌을 방지한다.
const FIELD_KEYWORDS: { field: FieldKey; keywords: string[] }[] = [
  { field: "pediatricBedRatio", keywords: ["병상", "공급비율", "공급 비율"] },
  { field: "pediatricAccessIndex", keywords: ["소아", "접근성", "야간"] },
  { field: "deliveryInfraIndex", keywords: ["분만인프라", "분만 인프라", "인프라지수", "인프라 지수"] },
  { field: "deliveryUncovered60", keywords: ["분만60분", "분만 60분", "분만실"] },
  { field: "emergencyRI", keywords: ["RI", "의료이용률", "이용률"] },
  { field: "emergencyUncovered60", keywords: ["응급60분", "응급 60분", "응급의료", "권역응급"] },
  { field: "population", keywords: ["인구수", "인구"] },
  { field: "sigunguCode", keywords: ["시군구코드", "행정코드", "지역코드"] },
  { field: "sigunguName", keywords: ["시군구명", "시군구", "지역명", "지역"] },
  { field: "sidoCode", keywords: ["시도코드"] },
  { field: "sidoName", keywords: ["시도명", "시도", "광역시도"] },
];

function autoMapColumns(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  const claimed = new Set<string>();

  for (const { field, keywords } of FIELD_KEYWORDS) {
    const match = headers.find(
      (h) => !claimed.has(h) && keywords.some((k) => h.toLowerCase().includes(k.toLowerCase()))
    );
    if (match) {
      mapping[field] = match;
      claimed.add(match);
    }
  }
  return mapping;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,%\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

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

  for (const record of records) {
    const rawNameOrCode =
      (mapping.sigunguName ? String(record[mapping.sigunguName] ?? "").trim() : "") ||
      (mapping.sigunguCode ? String(record[mapping.sigunguCode] ?? "").trim() : "");

    if (!rawNameOrCode) continue;

    const geo = findRegionByNameOrCode(rawNameOrCode);
    if (!geo) {
      unmatchedRegionNames.push(rawNameOrCode);
      continue;
    }

    rows.push({
      sidoCode: geo.sidoCode,
      sidoName: geo.sido,
      sigunguCode: geo.code,
      sigunguName: geo.name,
      population: mapping.population ? toNumber(record[mapping.population]) : 0,
      emergencyUncovered60: mapping.emergencyUncovered60
        ? toNumber(record[mapping.emergencyUncovered60])
        : 0,
      emergencyRI: mapping.emergencyRI ? toNumber(record[mapping.emergencyRI]) : 0,
      deliveryUncovered60: mapping.deliveryUncovered60
        ? toNumber(record[mapping.deliveryUncovered60])
        : 0,
      deliveryInfraIndex: mapping.deliveryInfraIndex
        ? toNumber(record[mapping.deliveryInfraIndex])
        : 0,
      pediatricAccessIndex: mapping.pediatricAccessIndex
        ? toNumber(record[mapping.pediatricAccessIndex])
        : 0,
      pediatricBedRatio: mapping.pediatricBedRatio
        ? toNumber(record[mapping.pediatricBedRatio])
        : 0,
    });
  }

  if (unmatchedRegionNames.length > 0) {
    warnings.push(
      `${unmatchedRegionNames.length}건의 행정구역명을 전국 시·군·구 목록과 매칭하지 못해 제외했습니다.`
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
