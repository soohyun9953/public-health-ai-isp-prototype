"use client";

import * as React from "react";
import { FileUp, Download, Sparkles, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/app-context";
import { generateSampleData } from "@/lib/sample-data";
import { downloadCsvTemplate } from "@/lib/csv-template";
import { parseUploadedFile } from "@/lib/parse-file";

export function FileUploadPanel() {
  const { loadRows, clearData, isSampleData, fileName, regions } = useAppContext();
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
          loadRows(result.rows, { isSample: false, fileName: file.name });
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

  const handleSampleToggle = () => {
    if (isSampleData) {
      clearData();
      setWarnings([]);
      setSuccessCount(null);
      return;
    }
    const rows = generateSampleData();
    loadRows(rows, { isSample: true, fileName: null });
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
          시·군·구별 필수의료 지표 CSV/XLSX 파일을 업로드하면 취약지 진단이 자동 실행됩니다.
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
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-accent" : "border-border bg-secondary/40 hover:bg-secondary/60"
          }`}
        >
          <FileUp className="h-6 w-6 text-muted-foreground" />
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

        {fileName && !isSampleData && (
          <div className="flex items-center justify-between rounded-md bg-secondary px-3 py-2 text-xs">
            <span className="truncate">📄 {fileName}</span>
            <button
              onClick={clearData}
              className="ml-2 shrink-0 rounded p-0.5 hover:bg-muted-foreground/10"
              aria-label="업로드 초기화"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {successCount !== null && (
          <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {successCount}개 시·군·구 데이터가 정상 반영되었습니다.
          </div>
        )}

        {warnings.map((w, i) => (
          <div
            key={i}
            className="flex items-start gap-1.5 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{w}</span>
          </div>
        ))}

        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
          <Button variant="outline" size="sm" className="flex-1" onClick={downloadCsvTemplate}>
            <Download className="h-3.5 w-3.5" />
            표준 템플릿 다운로드
          </Button>
          <Button
            variant={isSampleData ? "default" : "secondary"}
            size="sm"
            className="flex-1"
            onClick={handleSampleToggle}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isSampleData ? `샘플 데이터 사용 중 (${regions.length})` : "국립중앙의료원 샘플 데이터 로드"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
