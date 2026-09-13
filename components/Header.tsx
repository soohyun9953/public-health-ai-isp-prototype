import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-white">
      <div className="container flex flex-col gap-1 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">필수의료 취약지 AI 진단 플랫폼</h1>
            <p className="text-xs text-muted-foreground">
              국립중앙의료원 공공보건의료지원센터 · 응급·분만·소아 3대 취약지 진단 &amp; GIS 시각화 &amp; 사업계획서 자동 생성
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
