"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Filter } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useReceipts } from "@/lib/hooks/receipts";
import { useCategories } from "@/lib/hooks/categories";
import { formatKRW, formatDate } from "@/lib/utils";

const UNCATEGORIZED = "__none__";

export default function ReceiptsListPage() {
  const { data: receipts, isLoading } = useReceipts();
  const { data: categories } = useCategories();

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [period, setPeriod] = useState<"all" | "30d" | "month">("all");

  const filtered = useMemo(() => {
    let arr = receipts ?? [];
    if (categoryId !== "all") {
      arr = arr.filter((r) =>
        categoryId === UNCATEGORIZED
          ? !r.categoryId
          : r.categoryId === categoryId,
      );
    }
    if (period !== "all") {
      const now = new Date();
      const from =
        period === "30d"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);
      arr = arr.filter((r) => {
        const d = new Date(r.purchasedAt ?? r.createdAt);
        return d >= from;
      });
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((r) =>
        (r.vendor ?? "").toLowerCase().includes(needle),
      );
    }
    return arr;
  }, [receipts, categoryId, period, q]);

  // 카테고리별 합계 (현재 필터 적용 결과 기준).
  // 차트와 범례가 같은 순서/색상을 쓰도록 한 번만 정렬해서 반환한다.
  // (이전엔 ul.map 안에서 sort 를 호출했는데, in-place mutation 때문에
  //  첫 렌더 시 차트는 unsorted, 범례는 sorted 가 되어 색상이 어긋났음.)
  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    for (const r of filtered) {
      const cat = r.category;
      const key = cat?.id ?? UNCATEGORIZED;
      const name = cat?.name ?? "(미지정)";
      const color = cat?.color ?? "#cbd5e1";
      const cur = map.get(key) ?? { name, color, total: 0 };
      cur.total += r.totalAmount ?? 0;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const total = filtered.reduce((s, r) => s + (r.totalAmount ?? 0), 0);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">영수증 목록</h1>
          <p className="mt-2 text-slate-600">
            업로드된 영수증을 검색하고 카테고리/기간으로 필터링합니다.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + 영수증 업로드
        </Link>
      </div>

      {/* 필터 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Filter className="h-4 w-4" /> 필터
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="가맹점 검색"
            className="w-48 rounded-md border bg-white py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">전체 카테고리</option>
          <option value={UNCATEGORIZED}>(미지정)</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as typeof period)}
          className="rounded-md border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="all">전체 기간</option>
          <option value="month">이번 달</option>
          <option value="30d">최근 30일</option>
        </select>
        <div className="ml-auto text-sm text-slate-600">
          {filtered.length}건 · 합{" "}
          <span className="font-semibold text-slate-900">
            {formatKRW(total)}
          </span>
        </div>
      </div>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        {/* 카테고리 도넛 */}
        <div className="rounded-xl border bg-white p-5 shadow-sm md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700">
            카테고리 분포
          </h2>
          {byCategory.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              데이터 없음
            </p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byCategory}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={75}
                      strokeWidth={1}
                    >
                      {byCategory.map((c) => (
                        <Cell key={c.key} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatKRW(v)}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 space-y-1 text-xs">
                {byCategory.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                    <span className="tabular-nums">
                      {formatKRW(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* 테이블 */}
        <div className="rounded-xl border bg-white shadow-sm md:col-span-2">
          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              조건에 맞는 영수증이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">가맹점</th>
                  <th className="px-4 py-3">카테고리</th>
                  <th className="px-4 py-3">날짜</th>
                  <th className="px-4 py-3 text-right">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/receipts/${r.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {r.vendor ?? "(미상)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {r.category ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: r.category.color }}
                          />
                          {r.category.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          (미지정)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(r.purchasedAt ?? r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatKRW(r.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
