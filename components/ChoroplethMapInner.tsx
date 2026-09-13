"use client";

import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { Loader2, MapPin } from "lucide-react";
import { loadSigunguGeoJson, type SigunguFeature } from "@/lib/geo";
import { useAppContext } from "@/lib/app-context";
import { GRADE_META } from "@/lib/vulnerability-logic";
import { formatNumber } from "@/lib/utils";

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 860;

interface PathDatum {
  code: string;
  name: string;
  d: string;
}

interface TooltipState {
  x: number;
  y: number;
  code: string;
  name: string;
}

export default function ChoroplethMapInner() {
  const { regions, selectedCode, selectRegion } = useAppContext();
  const [paths, setPaths] = React.useState<PathDatum[] | null>(null);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadSigunguGeoJson().then((fc) => {
      if (cancelled) return;
      const projection = geoMercator().fitSize([VIEW_WIDTH, VIEW_HEIGHT], fc);
      const pathGenerator = geoPath(projection);
      const built = fc.features.map((f: SigunguFeature) => ({
        code: f.properties.code,
        name: f.properties.name,
        d: pathGenerator(f) ?? "",
      }));
      setPaths(built);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const regionByCode = React.useMemo(() => {
    const map = new Map<string, (typeof regions)[number]>();
    for (const r of regions) map.set(r.sigunguCode, r);
    return map;
  }, [regions]);

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, code: string, name: string) => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      code,
      name,
    });
  };

  if (!paths) {
    return (
      <div className="flex h-[560px] w-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        지도 데이터를 불러오는 중...
      </div>
    );
  }

  const hoveredRegion = tooltip ? regionByCode.get(tooltip.code) : null;

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-auto w-full max-h-[640px]"
        role="img"
        aria-label="대한민국 시군구 필수의료 취약지 지도"
      >
        {paths.map((p) => {
          const analysis = regionByCode.get(p.code);
          const fill = analysis ? GRADE_META[analysis.grade].colorHex : "#e2e8f0";
          const isSelected = p.code === selectedCode;
          return (
            <path
              key={p.code}
              d={p.d}
              fill={fill}
              stroke={isSelected ? "#0f172a" : "#ffffff"}
              strokeWidth={isSelected ? 1.6 : 0.5}
              className="cursor-pointer transition-[opacity,stroke] duration-150 hover:opacity-80"
              onMouseMove={(e) => handleMouseMove(e, p.code, p.name)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => selectRegion(p.code)}
            >
              <title>{p.name}</title>
            </path>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[160px] -translate-x-1/2 -translate-y-full rounded-md border border-border bg-white/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <div className="mb-1 flex items-center gap-1 font-semibold">
            <MapPin className="h-3 w-3" />
            {tooltip.name}
          </div>
          {hoveredRegion ? (
            <div className="flex flex-col gap-0.5 text-muted-foreground">
              <span>인구수: {formatNumber(hoveredRegion.population)}명</span>
              <span
                className="mt-0.5 inline-flex w-fit rounded px-1.5 py-0.5 font-medium"
                style={{
                  backgroundColor: GRADE_META[hoveredRegion.grade].colorHex + "33",
                  color: GRADE_META[hoveredRegion.grade].colorHex,
                }}
              >
                {GRADE_META[hoveredRegion.grade].label} ({hoveredRegion.vulnerableCount}개 부문 취약)
              </span>
              <span>
                응급 {hoveredRegion.isEmergencyVulnerable ? "⚠︎" : "○"} · 분만{" "}
                {hoveredRegion.isDeliveryVulnerable ? "⚠︎" : "○"} · 소아{" "}
                {hoveredRegion.isPediatricVulnerable ? "⚠︎" : "○"}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">업로드된 데이터가 없습니다.</p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
        {(["safe", "caution", "vulnerable", "critical"] as const).map((g) => (
          <div key={g} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: GRADE_META[g].colorHex }}
            />
            <span className="text-muted-foreground">{GRADE_META[g].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-slate-200" />
          <span className="text-muted-foreground">데이터 없음</span>
        </div>
      </div>
    </div>
  );
}
