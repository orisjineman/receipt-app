"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt as ReceiptIcon,
  Wallet,
  TrendingUp,
  Pencil,
  Check,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useReceipts } from "@/lib/hooks/receipts";
import { useSetting, useUpdateSetting } from "@/lib/hooks/settings";
import { formatKRW, formatDate, isInCurrentMonth } from "@/lib/utils";

export default function DashboardPage() {
  const { data: receipts, isLoading } = useReceipts();
  const { data: setting } = useSetting();
  const updateSetting = useUpdateSetting();

  const monthly = (receipts ?? []).filter((r) =>
    isInCurrentMonth(r.purchasedAt ?? r.createdAt),
  );
  const monthlyTotal = monthly.reduce(
    (sum, r) => sum + (r.totalAmount ?? 0),
    0,
  );

  // 가맹점 Top
  const byVendor = new Map<string, number>();
  for (const r of monthly) {
    const key = r.vendor ?? "(미상)";
    byVendor.set(key, (byVendor.get(key) ?? 0) + (r.totalAmount ?? 0));
  }
  const topVendors = [...byVendor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 최근 6개월 월별 합계
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${d.getMonth() + 1}월`,
        total: 0,
      });
    }
    for (const r of receipts ?? []) {
      const d = new Date(r.purchasedAt ?? r.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.total += r.totalAmount ?? 0;
    }
    return months;
  }, [receipts]);

  const recent = (receipts ?? []).slice(0, 6);
  const budget = setting?.monthlyBudget ?? null;
  const ratio = budget && budget > 0 ? monthlyTotal / budget : null;

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
          value={isLoading ? "..." : (topVendors[0]?.[0] ?? "-")}
          sub={topVendors[0] ? formatKRW(topVendors[0][1]) : undefined}
        />
      </div>

      {/* 예산 진행률 + 월별 추이 */}
      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <BudgetCard
          budget={budget}
          spent={monthlyTotal}
          ratio={ratio}
          onSave={async (v) => {
            await updateSetting.mutateAsync({ monthlyBudget: v });
          }}
        />

        <div className="rounded-xl border bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">최근 6개월</h2>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ left: -10, right: 8 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v: number) =>
                    v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => formatKRW(v)}
                  contentStyle={{ fontSize: 12 }}
                  cursor={{ fill: "#f1f5f9" }}
                />
                {budget ? (
                  <ReferenceLine
                    y={budget}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{
                      value: "예산",
                      position: "right",
                      fontSize: 10,
                      fill: "#ef4444",
                    }}
                  />
                ) : null}
                <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 가맹점 Top 5 + 최근 영수증 */}
      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">이번 달 가맹점 Top</h2>
          {topVendors.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              아직 이번 달 영수증이 없습니다.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topVendors.map(([vendor, amount]) => {
                const r = amount / monthlyTotal;
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
                        style={{ width: `${Math.max(r * 100, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

function BudgetCard({
  budget,
  spent,
  ratio,
  onSave,
}: {
  budget: number | null;
  spent: number;
  ratio: number | null;
  onSave: (v: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(budget?.toString() ?? "");

  useEffect(() => {
    setDraft(budget?.toString() ?? "");
  }, [budget]);

  const pct = ratio == null ? 0 : Math.min(ratio * 100, 100);
  const color =
    ratio == null
      ? "bg-slate-300"
      : ratio < 0.7
        ? "bg-emerald-500"
        : ratio < 1
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">월 예산</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="예산 변경"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 flex items-center gap-1">
          <input
            type="number"
            min={0}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="예: 500000"
            className="w-full rounded-md border bg-white px-2 py-1.5 text-sm tabular-nums focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={async () => {
              const n = draft.trim() === "" ? null : Number(draft);
              if (n != null && (!Number.isFinite(n) || n < 0)) return;
              await onSave(n);
              setEditing(false);
            }}
            className="rounded p-1 text-green-600 hover:bg-green-50"
            title="저장"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setDraft(budget?.toString() ?? "");
              setEditing(false);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            title="취소"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : budget == null ? (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 text-sm text-brand-600 hover:underline"
        >
          + 예산 설정하기
        </button>
      ) : (
        <>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-xl font-bold tabular-nums">
              {formatKRW(spent)}
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
              / {formatKRW(budget)}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
            <div
              className={`h-full ${color} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {ratio == null
              ? ""
              : ratio >= 1
                ? `예산 ${formatKRW(spent - budget)} 초과`
                : `남은 예산 ${formatKRW(budget - spent)}`}
          </div>
        </>
      )}
    </div>
  );
}
