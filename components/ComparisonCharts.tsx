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

function toVulnerabilityScore(stats: NationalStats) {
  return [
    { axis: "응급 미도달", value: stats.emergencyUncovered60 },
    { axis: "응급 이용률 부족", value: 100 - stats.emergencyRI },
    { axis: "분만 미도달", value: stats.deliveryUncovered60 },
    { axis: "분만 인프라 부족", value: 100 - stats.deliveryInfraIndex },
    { axis: "소아 접근성 부족", value: 100 - stats.pediatricAccessIndex },
    { axis: "소아 병상 부족", value: Math.max(0, 100 - stats.pediatricBedRatio) },
  ];
}

const RAW_METRIC_DEFS: { key: keyof NationalStats; label: string }[] = [
  { key: "emergencyUncovered60", label: "응급60분미도달(%)" },
  { key: "emergencyRI", label: "응급이용률RI(%)" },
  { key: "deliveryUncovered60", label: "분만60분미도달(%)" },
  { key: "deliveryInfraIndex", label: "분만인프라지수(%)" },
  { key: "pediatricAccessIndex", label: "소아접근성지수(%)" },
  { key: "pediatricBedRatio", label: "소아병상공급비율(%)" },
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
    emergencyUncovered60: selectedRegion.emergencyUncovered60,
    emergencyRI: selectedRegion.emergencyRI,
    deliveryUncovered60: selectedRegion.deliveryUncovered60,
    deliveryInfraIndex: selectedRegion.deliveryInfraIndex,
    pediatricAccessIndex: selectedRegion.pediatricAccessIndex,
    pediatricBedRatio: selectedRegion.pediatricBedRatio,
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

  const barData = RAW_METRIC_DEFS.map((def) => ({
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
        </div>
      </CardContent>
    </Card>
  );
}
