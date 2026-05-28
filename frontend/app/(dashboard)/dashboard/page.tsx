"use client";

import Link from "next/link";
import { Receipt as ReceiptIcon, Wallet, TrendingUp } from "lucide-react";
import { useReceipts } from "@/lib/hooks/receipts";
import { formatKRW, formatDate, isInCurrentMonth } from "@/lib/utils";

export default function DashboardPage() {
  const { data: receipts, isLoading, isError, error } = useReceipts();

  const monthly = (receipts ?? []).filter((r) =>
    isInCurrentMonth(r.purchasedAt ?? r.createdAt),
  );

  const monthlyTotal = monthly.reduce(
    (sum, r) => sum + (r.totalAmount ?? 0),
    0,
  );

  // 가맹점별 누적 (이번 달)
  const byVendor = new Map<string, number>();
  for (const r of monthly) {
    const key = r.vendor ?? "(미상)";
    byVendor.set(key, (byVendor.get(key) ?? 0) + (r.totalAmount ?? 0));
  }
  const topVendors = [...byVendor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recent = (receipts ?? []).slice(0, 6);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-2 text-slate-600">
            이번 달 지출과 최근 영수증을 한눈에 봅니다.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + 영수증 업로드
        </Link>
      </div>

      {isError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          데이터를 불러오지 못했습니다:{" "}
          {error instanceof Error ? error.message : "알 수 없는 오류"}
        </div>
      )}

      {/* 요약 카드 */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="이번 달 지출"
          value={isLoading ? "..." : formatKRW(monthlyTotal)}
        />
        <SummaryCard
          icon={<ReceiptIcon className="h-5 w-5" />}
          label="이번 달 영수증"
          value={isLoading ? "..." : `${monthly.length}건`}
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="가장 많이 쓴 곳"
          value={
            isLoading
              ? "..."
              : (topVendors[0]?.[0] ?? "-")
          }
          sub={
            topVendors[0] ? formatKRW(topVendors[0][1]) : undefined
          }
        />
      </div>

      {/* 가맹점 Top 5 */}
      <section className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">이번 달 가맹점 Top</h2>
          {topVendors.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              아직 이번 달 영수증이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topVendors.map(([vendor, amount]) => {
                const ratio = amount / monthlyTotal;
                return (
                  <li key={vendor} className="text-sm">
                    <div className="flex justify-between">
                      <span className="truncate">{vendor}</span>
                      <span className="tabular-nums font-medium">
                        {formatKRW(amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-100">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${Math.max(ratio * 100, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 최근 영수증 */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">최근 영수증</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
          ) : recent.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                업로드된 영수증이 아직 없습니다.
              </p>
              <Link
                href="/upload"
                className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
              >
                첫 영수증 업로드 →
              </Link>
            </div>
          ) : (
            <ul className="mt-4 divide-y">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/receipts/${r.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {r.vendor ?? "(미상)"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(r.purchasedAt ?? r.createdAt)}
                      </div>
                    </div>
                    <div className="shrink-0 tabular-nums text-sm font-medium">
                      {formatKRW(r.totalAmount)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
