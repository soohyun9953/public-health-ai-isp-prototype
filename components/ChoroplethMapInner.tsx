"use client";

import * as React from "react";
import { geoMercator, geoPath } from "d3-geo";
import { Loader2, MapPin, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { loadSigunguGeoJson, type SigunguFeature } from "@/lib/geo";
import { useAppContext } from "@/lib/app-context";
import { GRADE_META } from "@/lib/vulnerability-logic";
import { formatNumber } from "@/lib/utils";

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 860;
const MIN_SCALE = 1;
const MAX_SCALE = 16;
const DRAG_CLICK_THRESHOLD = 4; // 이 픽셀 이상 움직이면 클릭이 아닌 드래그로 간주

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

interface Transform {
  x: number;
  y: number;
  k: number;
}

const IDENTITY_TRANSFORM: Transform = { x: 0, y: 0, k: 1 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function ChoroplethMapInner() {
  const { regions, selectedCode, selectRegion } = useAppContext();
  const [paths, setPaths] = React.useState<PathDatum[] | null>(null);
  const [tooltip, setTooltip] = React.useState<TooltipState | null>(null);
  const [transform, setTransform] = React.useState<Transform>(IDENTITY_TRANSFORM);
  const [isPanning, setIsPanning] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const transformRef = React.useRef(transform);
  transformRef.current = transform;

  const panStateRef = React.useRef<{
    startClientX: number;
    startClientY: number;
    startTransform: Transform;
    moved: boolean;
    pointerId: number;
  } | null>(null);
  const suppressClickRef = React.useRef(false);

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

  const clientToViewBox = React.useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_WIDTH,
      y: ((clientY - rect.top) / rect.height) * VIEW_HEIGHT,
    };
  }, []);

  const zoomAt = React.useCallback(
    (viewBoxX: number, viewBoxY: number, factor: number) => {
      setTransform((prev) => {
        const newK = clamp(prev.k * factor, MIN_SCALE, MAX_SCALE);
        if (newK === prev.k) return prev;
        const dataX = (viewBoxX - prev.x) / prev.k;
        const dataY = (viewBoxY - prev.y) / prev.k;
        return {
          k: newK,
          x: viewBoxX - dataX * newK,
          y: viewBoxY - dataY * newK,
        };
      });
    },
    []
  );

  // 휠 이벤트는 React의 onWheel(패시브)로는 preventDefault가 불가능해
  // 페이지 스크롤을 막기 위해 네이티브 리스너를 직접 등록한다.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x: vx, y: vy } = clientToViewBox(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAt(vx, vy, factor);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
    // paths가 로드되어 지도 컨테이너가 실제로 DOM에 마운트된 이후에
    // containerRef가 채워지므로 paths를 의존성에 포함해 재등록한다.
  }, [clientToViewBox, zoomAt, paths]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    panStateRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTransform: transformRef.current,
      moved: false,
      pointerId: e.pointerId,
    };
    setIsPanning(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panStateRef.current;
    if (!pan) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const deltaClientX = e.clientX - pan.startClientX;
    const deltaClientY = e.clientY - pan.startClientY;

    if (!pan.moved && Math.hypot(deltaClientX, deltaClientY) > DRAG_CLICK_THRESHOLD) {
      pan.moved = true;
      setTooltip(null);
    }
    if (!pan.moved) return;

    const deltaViewBoxX = (deltaClientX / rect.width) * VIEW_WIDTH;
    const deltaViewBoxY = (deltaClientY / rect.height) * VIEW_HEIGHT;

    setTransform({
      k: pan.startTransform.k,
      x: pan.startTransform.x + deltaViewBoxX,
      y: pan.startTransform.y + deltaViewBoxY,
    });
  };

  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const pan = panStateRef.current;
    if (pan?.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    panStateRef.current = null;
    setIsPanning(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGPathElement>, code: string, name: string) => {
    if (panStateRef.current?.moved) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      code,
      name,
    });
  };

  const handlePathClick = (code: string) => {
    if (suppressClickRef.current) return;
    selectRegion(code);
  };

  const zoomButton = (factor: number) => () => {
    zoomAt(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, factor);
  };

  const resetZoom = () => {
    setTransform(IDENTITY_TRANSFORM);
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
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-xl border border-border/60 bg-[radial-gradient(120%_100%_at_50%_0%,#eef4f9,#e4ecf3)] ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onPointerCancel={endPan}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-auto w-full max-h-[640px]"
          role="img"
          aria-label="대한민국 시군구 필수의료 취약지 지도"
        >
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            {paths.map((p) => {
              const analysis = regionByCode.get(p.code);
              const fill = analysis ? GRADE_META[analysis.grade].colorHex : "#e2e8f0";
              const isSelected = p.code === selectedCode;
              return (
                <path
                  key={p.code}
                  d={p.d}
                  fill={fill}
                  stroke={isSelected ? "#0a3a5c" : "#ffffff"}
                  strokeWidth={isSelected ? 2 : 0.6}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer transition-[filter,stroke-width] duration-150 hover:brightness-[0.9] hover:saturate-[1.15]"
                  onMouseMove={(e) => handleMouseMove(e, p.code, p.name)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => handlePathClick(p.code)}
                >
                  <title>{p.name}</title>
                </path>
              );
            })}
          </g>
        </svg>

        <div className="absolute right-3 top-3 flex flex-col gap-0.5 rounded-lg border border-white/60 bg-white/70 p-1 shadow-elevated backdrop-blur-md">
          <button
            type="button"
            onClick={zoomButton(1.4)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/80 transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-90"
            aria-label="확대"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={zoomButton(1 / 1.4)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/80 transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-90"
            aria-label="축소"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <div className="mx-auto h-px w-5 bg-border" />
          <button
            type="button"
            onClick={resetZoom}
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/80 transition-all duration-150 hover:bg-primary hover:text-primary-foreground active:scale-90"
            aria-label="원래 크기로"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>

        {transform.k > 1.01 && (
          <div className="absolute bottom-3 right-3 rounded-md border border-white/60 bg-white/70 px-2 py-1 text-[11px] font-medium tabular-nums text-foreground/80 shadow-soft backdrop-blur-md">
            {Math.round(transform.k * 100)}%
          </div>
        )}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-[170px] -translate-x-1/2 -translate-y-full rounded-lg border border-white/60 bg-white/95 px-3 py-2.5 text-xs shadow-elevated backdrop-blur-sm"
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
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
        <span className="text-[11px] text-muted-foreground">마우스 휠로 확대/축소, 드래그로 이동</span>
      </div>
    </div>
  );
}
