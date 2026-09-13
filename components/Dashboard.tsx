"use client";

import { AppProvider } from "@/lib/app-context";
import { Header } from "@/components/Header";
import { FileUploadPanel } from "@/components/FileUploadPanel";
import { KpiSummary } from "@/components/KpiSummary";
import { ChoroplethMap } from "@/components/ChoroplethMap";
import { RegionDetailPanel } from "@/components/RegionDetailPanel";
import { ComparisonCharts } from "@/components/ComparisonCharts";
import { NarrativeGenerator } from "@/components/NarrativeGenerator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map } from "lucide-react";

export function Dashboard() {
  return (
    <AppProvider>
      <div className="relative min-h-screen bg-background">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_-10%,hsl(var(--primary)/0.06),transparent)]"
        />
        <Header />
        <main className="container flex flex-col gap-5 py-6 sm:py-8">
          <FileUploadPanel />
          <KpiSummary />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Map className="h-4 w-4 text-primary" />
                  전국 시·군·구 필수의료 취약지 GIS 지도
                </CardTitle>
                <CardDescription>
                  시·군·구를 클릭하면 우측 상세 대시보드와 사업계획서 서술문이 동기화됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChoroplethMap />
              </CardContent>
            </Card>

            <RegionDetailPanel />
          </div>

          <Tabs defaultValue="chart" className="w-full">
            <TabsList>
              <TabsTrigger value="chart">비교 분석 차트</TabsTrigger>
              <TabsTrigger value="narrative">사업계획서 서술문</TabsTrigger>
            </TabsList>
            <TabsContent value="chart">
              <ComparisonCharts />
            </TabsContent>
            <TabsContent value="narrative">
              <NarrativeGenerator />
            </TabsContent>
          </Tabs>

          <footer className="border-t border-border/70 py-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            본 플랫폼의 진단 수치는 업로드된 데이터 또는 국립중앙의료원 「2024 지역별 공공보건의료 통계」를 기반으로
            클라이언트에서 즉시 계산되며, 외부 서버로 전송되지 않습니다.
          </footer>
        </main>
      </div>
    </AppProvider>
  );
}
