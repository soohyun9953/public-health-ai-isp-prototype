import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "필수의료 취약지 AI 진단 플랫폼 | 국립중앙의료원 공공보건의료지원센터",
  description:
    "응급·분만·소아 필수의료 취약지 지표 진단, 전국 시·군·구 GIS 시각화, 공문서 개조식 사업계획서 서술문을 자동 생성하는 공공보건의료 AI ISP 프로토타입",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
