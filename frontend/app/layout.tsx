import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영수증 지출 관리",
  description: "영수증을 업로드하고 자동으로 지출을 관리하세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
