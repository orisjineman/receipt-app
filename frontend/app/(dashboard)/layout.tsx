import Link from "next/link";
import { UploadQueueProvider } from "@/lib/upload-queue";
import { UploadQueueWidget } from "@/components/upload-queue-widget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UploadQueueProvider>
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r bg-white p-6 md:block">
          <div className="text-lg font-bold">영수증</div>
          <nav className="mt-8 flex flex-col gap-1 text-sm">
            <Link
              href="/dashboard"
              className="rounded px-3 py-2 hover:bg-slate-100"
            >
              대시보드
            </Link>
            <Link
              href="/receipts"
              className="rounded px-3 py-2 hover:bg-slate-100"
            >
              영수증 목록
            </Link>
            <Link
              href="/upload"
              className="rounded px-3 py-2 hover:bg-slate-100"
            >
              영수증 업로드
            </Link>
            <Link
              href="/categories"
              className="rounded px-3 py-2 hover:bg-slate-100"
            >
              카테고리
            </Link>
          </nav>
        </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>

      {/* 페이지 어디에 있든 큐 진행 상황을 노출 (단 /upload 본 페이지에선 숨김) */}
      <UploadQueueWidget />
    </UploadQueueProvider>
  );
}
