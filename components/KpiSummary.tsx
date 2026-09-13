"use client";

import * as React from "react";
import { AlertOctagon, ShieldAlert, ShieldCheck, ShieldQuestion, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAppContext } from "@/lib/app-context";
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
      value: `${regions.length}개`,
      sub: `총 인구 ${formatNumber(totalPopulation)}명`,
      icon: Users,
      className: "text-primary",
    },
    {
      label: "심각 (3대 부문 모두 취약)",
      value: `${counts.critical}개`,
      sub: "즉시 정책 개입 필요",
      icon: AlertOctagon,
      className: "text-red-600",
    },
    {
      label: "취약 (2개 부문 취약)",
      value: `${counts.vulnerable}개`,
      sub: "우선 지원 검토 대상",
      icon: ShieldAlert,
      className: "text-orange-500",
    },
    {
      label: "관찰 필요 (1개 부문 취약)",
      value: `${counts.caution}개`,
      sub: `취약인구 ${formatNumber(vulnerablePopulation)}명`,
      icon: ShieldQuestion,
      className: "text-yellow-500",
    },
    {
      label: "정상",
      value: `${counts.safe}개`,
      sub: "3대 기준 모두 충족",
      icon: ShieldCheck,
      className: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.className}`} />
            </div>
            <span className="text-2xl font-bold">{c.value}</span>
            <span className="text-[11px] text-muted-foreground">{c.sub}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
