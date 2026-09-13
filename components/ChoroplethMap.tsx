"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// GIS 지도 컴포넌트는 브라우저 DOM(window/SVG 측정)에 의존하므로
// Next.js SSR 단계에서 렌더링되지 않도록 ssr: false로 동적 임포트한다.
const ChoroplethMapInner = dynamic(() => import("./ChoroplethMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] w-full items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      지도를 준비하는 중...
    </div>
  ),
});

export function ChoroplethMap() {
  return <ChoroplethMapInner />;
}
