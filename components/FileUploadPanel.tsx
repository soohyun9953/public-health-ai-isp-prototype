"use client";

import * as React from "react";
import { FileUp, Download, Database, AlertTriangle, CheckCircle2, FileText, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/app-context";
import { loadRealHealthData2024, DATA_SOURCE_LABEL } from "@/lib/real-health-data-2024";
import { downloadCsvTemplate } from "@/lib/csv-template";
import { parseUploadedFile } from "@/lib/parse-file";

export function FileUploadPanel() {
  const { loadRows, clearData, isBuiltInDataset, fileName, regions } = useAppContext();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [successCount, setSuccessCount] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setWarnings([]);
      setSuccessCount(null);
      try {
        const result = await parseUploadedFile(file);
        if (result.rows.length > 0) {
          loadRows(result.rows, { isBuiltIn: false, fileName: file.name });
          setSuccessCount(result.rows.length);
        }
        setWarnings(result.warnings);
      } catch (err) {
        setWarnings([
          `파일 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [loadRows]
  );

  const handleBuiltInToggle = () => {
    if (isBuiltInDataset) {
      clearData();
      setWarnings([]);
      setSuccessCount(null);
      return;
    }
    const rows = loadRealHealthData2024();
    loadRows(rows, { isBuiltIn: true, fileName: null });
    setWarnings([]);
    setSuccessCount(rows.length);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="h-4 w-4 text-primary" />
          데이터 업로드
        </CardTitle>
        <CardDescription>
          표준 템플릿 또는 국립중앙의료원 「지역별 공공보건의료 통계」 원본 파일(xlsx)을 업로드하면
          취약지 진단이 자동 실행됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-7 text-center transition-all duration-200 ${
            isDragging
              ? "scale-[1.01] border-primary bg-accent"
              : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-accent/40"
          }`}
        >
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-primary shadow-soft transition-transform duration-200 group-hover:scale-110 ${
              isProcessing ? "animate-pulse" : ""
            }`}
          >
            <FileUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">
            {isProcessing ? "파일 분석 중..." : "파일을 드래그하거나 클릭하여 업로드"}
          </p>
          <p className="text-xs text-muted-foreground">CSV, XLSX (.xls) 지원</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {fileName && !isBuiltInDataset && (
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/50 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 truncate">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {fileName}
            </span>
            <button
              onClick={clearData}
              className="ml-2 shrink-0 rounded p-0.5 transition-colors hover:bg-muted-foreground/10"
              aria-label="업로드 초기화"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {successCount !== null && (
          <div className="flex items-center gap-2 rounded-md border-l-2 border-green-500 bg-green-50 px-3 py-2 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {successCount}개 시·군·구 데이터가 정상 반영되었습니다.
          </div>
        )}

        {warnings.map((w, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-md border-l-2 border-yellow-500 bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{w}</span>
          </div>
        ))}

        <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row">
          <Button variant="outline" size="sm" className="flex-1" onClick={downloadCsvTemplate}>
            <Download className="h-3.5 w-3.5" />
            표준 템플릿 다운로드
          </Button>
          <Button
            variant={isBuiltInDataset ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={handleBuiltInToggle}
          >
            <Database className="h-3.5 w-3.5" />
            {isBuiltInDataset ? `2024 실측 데이터 사용 중 (${regions.length})` : "2024 지역별 공공보건의료 통계 불러오기"}
          </Button>
        </div>
        {isBuiltInDataset && (
          <p className="text-[11px] text-muted-foreground">
            자료: {DATA_SOURCE_LABEL}. 실적 부족으로 지표 산출이 불가능했던 시·군·구는 보수적으로 취약 판정에
            반영되었습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
