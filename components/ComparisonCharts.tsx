"use client";

import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/app-context";
import { computeNationalStats, computeSidoStats } from "@/lib/vulnerability-logic";
import type { NationalStats } from "@/lib/types";

const SERIES_COLORS = {
  region: "#0072BA",
  sido: "#f59e0b",
  national: "#94a3b8",
};

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

function toVulnerabilityScore(stats: NationalStats) {
  return [
    { axis: "응급 이용률(RI) 부족", value: clamp100(100 - stats.emergencyRI) },
    { axis: "응급 전원율 과다", value: clamp100((stats.emergencyTransferRate / 20) * 100) },
    { axis: "분만 이용률(RI) 부족", value: clamp100(100 - stats.deliveryRI) },
    { axis: "분만기관 부족", value: clamp100(100 - (stats.deliveryFacilityRate / 3) * 100) },
    { axis: "소아 이용률(RI) 부족", value: clamp100(100 - stats.pediatricRI) },
    { axis: "소아전문의 부족", value: clamp100(100 - (stats.pediatricSpecialistRate / 120) * 100) },
  ];
}

// 세 RI 지표는 모두 %(0~100) 스케일이라 하나의 막대차트에서 직접 비교 가능하다.
const RI_METRIC_DEFS: { key: keyof NationalStats; label: string }[] = [
  { key: "emergencyRI", label: "응급 관내이용률(RI, %)" },
  { key: "deliveryRI", label: "분만 관내이용률(RI, %)" },
  { key: "pediatricRI", label: "소아 관내이용률(RI, %)" },
];

// 단위가 서로 다른 자원지표는 막대차트 대신 개별 카드로 비교한다.
const RESOURCE_METRIC_DEFS: { key: keyof NationalStats; label: string; unit: string; digits: number }[] = [
  { key: "emergencyTransferRate", label: "중증응급환자 전원율", unit: "%", digits: 1 },
  { key: "deliveryFacilityRate", label: "분만가능기관 수", unit: "개소/출생아천명", digits: 2 },
  { key: "pediatricSpecialistRate", label: "소아청소년과 전문의 수", unit: "명/소아10만명", digits: 1 },
];

export function ComparisonCharts() {
  const { regions, selectedRegion } = useAppContext();
  const captureRef = React.useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);

  const handleExportPng = async () => {
    if (!captureRef.current) return;
    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(captureRef.current, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `${selectedRegion?.sigunguName ?? "비교"}_필수의료취약지_비교차트.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setIsCapturing(false);
    }
  };

  if (regions.length === 0 || !selectedRegion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">비교 분석 차트</CardTitle>
          <CardDescription>지역을 선택하면 시·도/전국 평균과 비교됩니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const regionStats: NationalStats = {
    population: selectedRegion.population,
    emergencyRI: selectedRegion.emergencyRI,
    emergencyTransferRate: selectedRegion.emergencyTransferRate,
    deliveryRI: selectedRegion.deliveryRI,
    deliveryFacilityRate: selectedRegion.deliveryFacilityRate,
    pediatricRI: selectedRegion.pediatricRI,
    pediatricSpecialistRate: selectedRegion.pediatricSpecialistRate,
  };
  const sidoStats = computeSidoStats(regions, selectedRegion.sidoName);
  const nationalStats = computeNationalStats(regions);

  const regionScore = toVulnerabilityScore(regionStats);
  const sidoScore = toVulnerabilityScore(sidoStats);
  const nationalScore = toVulnerabilityScore(nationalStats);

  const radarData = regionScore.map((d, i) => ({
    axis: d.axis,
    [selectedRegion.sigunguName]: Number(d.value.toFixed(1)),
    [`${selectedRegion.sidoName} 평균`]: Number(sidoScore[i].value.toFixed(1)),
    "전국 평균": Number(nationalScore[i].value.toFixed(1)),
  }));

  const barData = RI_METRIC_DEFS.map((def) => ({
    metric: def.label,
    [selectedRegion.sigunguName]: Number(regionStats[def.key].toFixed(1)),
    [`${selectedRegion.sidoName} 평균`]: Number(sidoStats[def.key].toFixed(1)),
    "전국 평균": Number(nationalStats[def.key].toFixed(1)),
  }));

  const regionKey = selectedRegion.sigunguName;
  const sidoKey = `${selectedRegion.sidoName} 평균`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">비교 분석 차트</CardTitle>
          <CardDescription>
            {selectedRegion.sigunguName} vs {selectedRegion.sidoName} 평균 vs 전국 평균
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={handleExportPng} disabled={isCapturing}>
          <Camera className="h-3.5 w-3.5" />
          {isCapturing ? "저장 중..." : "PNG 저장"}
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={captureRef} className="flex flex-col gap-6 bg-white p-1">
          <div className="h-[320px] w-full">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              부문별 취약도 레이더 (수치가 클수록 취약)
            </p>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar
                  name={regionKey}
                  dataKey={regionKey}
                  stroke={SERIES_COLORS.region}
                  fill={SERIES_COLORS.region}
                  fillOpacity={0.35}
                />
                <Radar
                  name={sidoKey}
                  dataKey={sidoKey}
                  stroke={SERIES_COLORS.sido}
                  fill={SERIES_COLORS.sido}
                  fillOpacity={0.15}
                />
                <Radar
                  name="전국 평균"
                  dataKey="전국 평균"
                  stroke={SERIES_COLORS.national}
                  fill={SERIES_COLORS.national}
                  fillOpacity={0.1}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-[340px] w-full">
            <p className="mb-1 text-xs font-medium text-muted-foreground">지표별 수평 비교</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="metric"
                  width={130}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={regionKey} fill={SERIES_COLORS.region} radius={[0, 3, 3, 0]} />
                <Bar dataKey={sidoKey} fill={SERIES_COLORS.sido} radius={[0, 3, 3, 0]} />
                <Bar dataKey="전국 평균" fill={SERIES_COLORS.national} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">자원지표 비교 (단위가 달라 개별 비교)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {RESOURCE_METRIC_DEFS.map((def) => (
                <div
                  key={def.key}
                  className="rounded-lg border border-border/60 bg-secondary/20 p-3.5 text-xs transition-colors hover:border-primary/30"
                >
                  <p className="mb-1.5 font-medium text-foreground">{def.label}</p>
                  <div className="flex flex-col gap-0.5 text-muted-foreground">
                    <span>
                      {regionKey}:{" "}
                      <span className="font-semibold text-foreground">
                        {regionStats[def.key].toFixed(def.digits)}
                        {def.unit}
                      </span>
                    </span>
                    <span>
                      {sidoKey}: {sidoStats[def.key].toFixed(def.digits)}
                      {def.unit}
                    </span>
                    <span>
                      전국 평균: {nationalStats[def.key].toFixed(def.digits)}
                      {def.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
