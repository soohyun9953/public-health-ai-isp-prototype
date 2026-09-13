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
import { formatNumber } from "@/lib/utils";

function MetricRow({
  label,
  displayValue,
  barPct,
  thresholdLabel,
  isBad,
  isMissing,
}: {
  label: string;
  displayValue: string;
  barPct: number;
  thresholdLabel: string;
  isBad: boolean;
  isMissing?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, barPct));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${isBad ? "text-red-600" : "text-foreground"}`}>
          {isMissing ? "실적 없음" : displayValue}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${isBad ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
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
          <CardDescription>데이터를 업로드하거나 2024 실측 데이터를 불러오면 표시됩니다.</CardDescription>
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
  const isMissing = (key: (typeof selectedRegion)["missingIndicators"][number]) =>
    selectedRegion.missingIndicators.includes(key);

  const sections = [
    {
      title: "① 응급의료",
      isVulnerable: selectedRegion.isEmergencyVulnerable,
      metrics: [
        {
          label: "응급의료서비스 관내의료이용률(RI)",
          displayValue: `${selectedRegion.emergencyRI.toFixed(1)}%`,
          barPct: selectedRegion.emergencyRI,
          thresholdLabel: "기준: 30% 미만 시 취약",
          isBad: selectedRegion.emergencyRI < THRESHOLDS.emergency.ri,
          isMissing: isMissing("emergencyRI"),
        },
        {
          label: "중증응급환자 전원율",
          displayValue: `${selectedRegion.emergencyTransferRate.toFixed(1)}%`,
          barPct: (selectedRegion.emergencyTransferRate / 20) * 100,
          thresholdLabel: "기준: 5% 초과 시 취약",
          isBad: selectedRegion.emergencyTransferRate > THRESHOLDS.emergency.transferRate,
          isMissing: isMissing("emergencyTransferRate"),
        },
      ],
    },
    {
      title: "② 분만·모자의료",
      isVulnerable: selectedRegion.isDeliveryVulnerable,
      metrics: [
        {
          label: "분만 입원서비스 관내의료이용률(RI)",
          displayValue: `${selectedRegion.deliveryRI.toFixed(1)}%`,
          barPct: selectedRegion.deliveryRI,
          thresholdLabel: "기준: 30% 미만 시 취약",
          isBad: selectedRegion.deliveryRI < THRESHOLDS.delivery.ri,
          isMissing: isMissing("deliveryRI"),
        },
        {
          label: "분만가능기관 수 (출생아 1천명당)",
          displayValue: `${selectedRegion.deliveryFacilityRate.toFixed(2)}개소`,
          barPct: (selectedRegion.deliveryFacilityRate / 3) * 100,
          thresholdLabel: "기준: 1.0개소 미만 시 취약",
          isBad: selectedRegion.deliveryFacilityRate < THRESHOLDS.delivery.facilityRate,
          isMissing: isMissing("deliveryFacilityRate"),
        },
      ],
    },
    {
      title: "③ 소아·중증진료",
      isVulnerable: selectedRegion.isPediatricVulnerable,
      metrics: [
        {
          label: "소아청소년입원 관내의료이용률(RI)",
          displayValue: `${selectedRegion.pediatricRI.toFixed(1)}%`,
          barPct: selectedRegion.pediatricRI,
          thresholdLabel: "기준: 30% 미만 시 취약",
          isBad: selectedRegion.pediatricRI < THRESHOLDS.pediatric.ri,
          isMissing: isMissing("pediatricRI"),
        },
        {
          label: "소아청소년과 전문의 수 (소아인구 10만명당)",
          displayValue: `${selectedRegion.pediatricSpecialistRate.toFixed(1)}명`,
          barPct: (selectedRegion.pediatricSpecialistRate / 120) * 100,
          thresholdLabel: "기준: 40명 미만 시 취약",
          isBad: selectedRegion.pediatricSpecialistRate < THRESHOLDS.pediatric.specialistRate,
          isMissing: isMissing("pediatricSpecialistRate"),
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
          <div
            key={section.title}
            className={`flex flex-col gap-2.5 rounded-lg border p-3.5 transition-colors ${
              section.isVulnerable ? "border-red-200 bg-red-50/40" : "border-border/60 bg-secondary/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold tracking-tight">{section.title}</span>
              {section.isVulnerable ? (
                <span className="flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  취약
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
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
