"use client";

import * as React from "react";
import { ClipboardCopy, CheckCheck, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/app-context";
import { computeNationalStats, computeSidoStats } from "@/lib/vulnerability-logic";
import { buildNarrative } from "@/lib/narrative";

export function NarrativeGenerator() {
  const { regions, selectedRegion } = useAppContext();
  const [copied, setCopied] = React.useState(false);

  if (regions.length === 0 || !selectedRegion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">공문서 개조식 사업계획서 서술문</CardTitle>
          <CardDescription>지역을 선택하면 서술문이 자동 생성됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sidoStats = computeSidoStats(regions, selectedRegion.sidoName);
  const nationalStats = computeNationalStats(regions);
  const narrative = buildNarrative(selectedRegion, sidoStats, nationalStats);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            공문서 개조식 사업계획서 서술문
          </CardTitle>
          <CardDescription>
            {selectedRegion.sigunguName} 진단 결과 기반 자동 생성 (보건복지부·국립중앙의료원 공모사업 신청서 양식)
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleCopy}>
          {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
          {copied ? "복사됨" : "개조식 문안 전체 복사"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-secondary/30 p-5 font-sans text-[13.5px] leading-relaxed">
          {narrative}
        </pre>
      </CardContent>
    </Card>
  );
}
