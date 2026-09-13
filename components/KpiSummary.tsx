"use client";

import * as React from "react";
import { AlertOctagon, ShieldAlert, ShieldCheck, ShieldQuestion, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
import { GRADE_META } from "@/lib/vulnerability-logic";
import { formatNumber } from "@/lib/utils";

export function KpiSummary() {
  const { regions } = useAppContext();

  const counts = React.useMemo(() => {
    const base = { safe: 0, caution: 0, vulnerable: 0, critical: 0 };
    for (const r of regions) base[r.grade] += 1;
    return base;
  }, [regions]);

  const totalPopulation = React.useMemo(
    () => regions.reduce((sum, r) => sum + r.population, 0),
    [regions]
  );

  const vulnerablePopulation = React.useMemo(
    () =>
      regions
        .filter((r) => r.grade === "vulnerable" || r.grade === "critical")
        .reduce((sum, r) => sum + r.population, 0),
    [regions]
  );

  const cards = [
    {
      label: "분석 대상 시·군·구",
      value: regions.length,
      sub: `총 인구 ${formatNumber(totalPopulation)}명`,
      icon: Users,
      accent: "#0a5c93",
    },
    {
      label: "심각 (3대 부문 모두 취약)",
      value: counts.critical,
      sub: "즉시 정책 개입 필요",
      icon: AlertOctagon,
      accent: GRADE_META.critical.colorHex,
    },
    {
      label: "취약 (2개 부문 취약)",
      value: counts.vulnerable,
      sub: "우선 지원 검토 대상",
      icon: ShieldAlert,
      accent: GRADE_META.vulnerable.colorHex,
    },
    {
      label: "관찰 필요 (1개 부문 취약)",
      value: counts.caution,
      sub: `취약인구 ${formatNumber(vulnerablePopulation)}명`,
      icon: ShieldQuestion,
      accent: GRADE_META.caution.colorHex,
    },
    {
      label: "정상",
      value: counts.safe,
      sub: "3대 기준 모두 충족",
      icon: ShieldCheck,
      accent: GRADE_META.safe.colorHex,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="group relative overflow-hidden hover:-translate-y-0.5">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ backgroundColor: c.accent }}
          />
          <CardContent className="flex flex-col gap-1.5 p-4 pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-medium text-muted-foreground">{c.label}</span>
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: `${c.accent}1a`, color: c.accent }}
              >
                <c.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <span className="text-[28px] font-bold leading-none tabular-nums tracking-tight">
              {formatNumber(c.value)}
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">개</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{c.sub}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
