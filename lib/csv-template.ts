export const CSV_TEMPLATE_HEADERS = [
  "시도코드",
  "시도명",
  "시군구코드",
  "시군구명",
  "인구수",
  "응급60분미도달인구비율(%)",
  "의료이용률RI(%)",
  "분만60분미도달인구비율(%)",
  "분만인프라지수(%)",
  "소아야간휴일접근성지수(%)",
  "소아병상공급비율(%)",
] as const;

const SAMPLE_ROWS: (string | number)[][] = [
  ["11", "서울특별시", "11010", "종로구", 145000, 8.2, 78.4, 12.1, 82.3, 76.5, 92.1],
  ["37", "경상북도", "37310", "봉화군", 30500, 62.4, 21.3, 68.7, 24.8, 31.2, 28.6],
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
