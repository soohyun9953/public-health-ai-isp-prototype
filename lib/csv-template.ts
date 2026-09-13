export const CSV_TEMPLATE_HEADERS = [
  "시도코드",
  "시도명",
  "시군구코드",
  "시군구명",
  "인구수",
  "응급의료서비스관내이용률RI(%)",
  "중증응급환자전원율(%)",
  "분만입원서비스관내이용률RI(%)",
  "분만가능기관수(개소_출생아1천명당)",
  "소아청소년입원관내이용률RI(%)",
  "소아청소년과전문의수(명_소아인구10만명당)",
] as const;

const SAMPLE_ROWS: (string | number)[][] = [
  ["11", "서울특별시", "11010", "종로구", 138336, 40.6, 7.2, 22.2, 4.6, 21.6, 464.1],
  ["37", "경상북도", "37310", "봉화군", 30500, 0, 4.3, 0, 0, 12.4, 22.8],
];

export function buildCsvTemplateString(): string {
  const headerLine = CSV_TEMPLATE_HEADERS.join(",");
  const rowLines = SAMPLE_ROWS.map((row) => row.join(","));
  return [headerLine, ...rowLines].join("\r\n");
}

export function downloadCsvTemplate(): void {
  const csv = "﻿" + buildCsvTemplateString();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "필수의료_취약지_진단_표준템플릿.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
