"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/lib/app-context";
import { GRADE_META, THRESHOLDS } from "@/lib/vulnerability-logic";
import { formatNumber, formatPercent } from "@/lib/utils";

function MetricRow({
  label,
  value,
  unit,
  thresholdLabel,
  isBad,
  invert,
}: {
  label: string;
  value: number;
  unit: string;
  thresholdLabel: string;
  isBad: boolean;
  invert?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${isBad ? "text-red-600" : "text-foreground"}`}>
          {formatPercent(value)}
          {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${isBad ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${invert ? 100 - pct : pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground">{thresholdLabel}</span>
    </div>
  );
}

export function RegionDetailPanel() {
  const { regions, selectedRegion, selectRegion } = useAppContext();

  if (regions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">지역 상세 진단</CardTitle>
          <CardDescription>데이터를 업로드하거나 샘플 데이터를 불러오면 표시됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!selectedRegion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">지역 상세 진단</CardTitle>
          <CardDescription>지도에서 시·군·구를 클릭해 주세요.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const grade = GRADE_META[selectedRegion.grade];

  const sections = [
    {
      title: "① 응급의료",
      isVulnerable: selectedRegion.isEmergencyVulnerable,
      metrics: [
        {
          label: "권역응급센터 60분 미도달 인구 비율",
          value: selectedRegion.emergencyUncovered60,
          unit: "",
          thresholdLabel: `기준: 30% 초과 시 취약`,
          isBad: selectedRegion.emergencyUncovered60 > THRESHOLDS.emergency.uncovered60,
        },
        {
          label: "중증응급환자 의료이용률(RI)",
          value: selectedRegion.emergencyRI,
          unit: "",
          thresholdLabel: `기준: 30% 미만 시 취약`,
          isBad: selectedRegion.emergencyRI < THRESHOLDS.emergency.ri,
          invert: true,
        },
      ],
    },
    {
      title: "② 분만·모자의료",
      isVulnerable: selectedRegion.isDeliveryVulnerable,
      metrics: [
        {
          label: "분만실 60분 미도달 인구 비율",
          value: selectedRegion.deliveryUncovered60,
          unit: "",
          thresholdLabel: `기준: 30% 초과 시 취약`,
          isBad: selectedRegion.deliveryUncovered60 > THRESHOLDS.delivery.uncovered60,
        },
        {
          label: "가임기 여성 대비 분만 인프라 지수",
          value: selectedRegion.deliveryInfraIndex,
          unit: "",
          thresholdLabel: `기준: 40% 미만 시 취약`,
          isBad: selectedRegion.deliveryInfraIndex < THRESHOLDS.delivery.infraIndex,
          invert: true,
        },
      ],
    },
    {
      title: "③ 소아·중증진료",
      isVulnerable: selectedRegion.isPediatricVulnerable,
      metrics: [
        {
          label: "소아 야간·휴일 진료 접근성 지수",
          value: selectedRegion.pediatricAccessIndex,
          unit: "",
          thresholdLabel: "참고 지표 (판정 미반영)",
          isBad: false,
          invert: true,
        },
        {
          label: "기준 병상 대비 소아 병상 공급 비율",
          value: selectedRegion.pediatricBedRatio,
          unit: "",
          thresholdLabel: `기준: 60% 미만 시 취약`,
          isBad: selectedRegion.pediatricBedRatio < THRESHOLDS.pediatric.bedRatio,
          invert: true,
        },
      ],
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{selectedRegion.sigunguName}</CardTitle>
            <CardDescription>
              {selectedRegion.sidoName} · 인구 {formatNumber(selectedRegion.population)}명
            </CardDescription>
          </div>
          <Badge className={grade.badgeClass} variant="outline">
            {grade.label}
          </Badge>
        </div>

        <Select
          value={selectedRegion.sigunguCode}
          onValueChange={(v) => selectRegion(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="지역 선택" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {regions.map((r) => (
              <SelectItem key={r.sigunguCode} value={r.sigunguCode}>
                {r.sidoName} {r.sigunguName} · {GRADE_META[r.grade].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{section.title}</span>
              {section.isVulnerable ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  취약
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  충족
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {section.metrics.map((m) => (
                <MetricRow key={m.label} {...m} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
