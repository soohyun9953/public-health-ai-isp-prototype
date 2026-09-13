import { Activity, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-border/70 bg-white/85 backdrop-blur-md">
      <div
        aria-hidden
        className="bg-grain pointer-events-none absolute inset-0 opacity-[0.03]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(60%_140%_at_8%_0%,hsl(var(--primary)/0.08),transparent)]"
      />
      <div className="container relative flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#0a4a78] text-primary-foreground shadow-glow-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold leading-tight tracking-tight sm:text-lg">
              필수의료 취약지 AI 진단 플랫폼
            </h1>
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              국립중앙의료원 공공보건의료지원센터 · 응급·분만·소아 3대 취약지 진단 &amp; GIS 시각화 &amp; 사업계획서 자동
              생성
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start rounded-full border border-primary/20 bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground sm:self-auto">
          <Sparkles className="h-3 w-3" />
          2024 국립중앙의료원 실측 데이터 연동
        </div>
      </div>
    </header>
  );
}
