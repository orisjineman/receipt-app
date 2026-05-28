"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  useReceipt,
  useUpdateReceipt,
  useDeleteReceipt,
} from "@/lib/hooks/receipts";
import { formatKRW, formatDate } from "@/lib/utils";

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: receipt, isLoading, isError, error } = useReceipt(id);
  const update = useUpdateReceipt(id);
  const del = useDeleteReceipt();

  const [vendor, setVendor] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");

  // 서버 값으로 폼 초기화
  useEffect(() => {
    if (!receipt) return;
    setVendor(receipt.vendor ?? "");
    setTotalAmount(receipt.totalAmount?.toString() ?? "");
    setPurchasedAt(
      receipt.purchasedAt
        ? new Date(receipt.purchasedAt).toISOString().slice(0, 10)
        : "",
    );
  }, [receipt]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 불러오는 중...
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        영수증을 찾을 수 없습니다:{" "}
        {error instanceof Error ? error.message : "알 수 없는 오류"}
      </div>
    );
  }

  const dirty =
    vendor !== (receipt.vendor ?? "") ||
    totalAmount !== (receipt.totalAmount?.toString() ?? "") ||
    purchasedAt !==
      (receipt.purchasedAt
        ? new Date(receipt.purchasedAt).toISOString().slice(0, 10)
        : "");

  async function onSave() {
    const data: {
      vendor?: string;
      totalAmount?: number;
      purchasedAt?: string;
    } = {};
    if (vendor !== (receipt!.vendor ?? "")) data.vendor = vendor;
    if (totalAmount !== (receipt!.totalAmount?.toString() ?? "")) {
      const n = Number(totalAmount);
      if (Number.isFinite(n) && n >= 0) data.totalAmount = n;
    }
    if (
      purchasedAt &&
      purchasedAt !==
        (receipt!.purchasedAt
          ? new Date(receipt!.purchasedAt).toISOString().slice(0, 10)
          : "")
    ) {
      data.purchasedAt = new Date(purchasedAt).toISOString();
    }
    await update.mutateAsync(data);
  }

  async function onDelete() {
    if (!confirm("이 영수증을 삭제할까요? (되돌릴 수 없음)")) return;
    await del.mutateAsync(receipt!.id);
    router.push("/dashboard");
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> 대시보드
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{receipt.vendor ?? "(미상)"}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <StatusBadge status={receipt.status} />
            <span>업로드 {formatDate(receipt.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          disabled={del.isPending}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> 삭제
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* 영수증 이미지 */}
        <div className="rounded-xl border bg-white p-3 shadow-sm">
          {/* private blob 은 직접 접근 불가. backend 프록시가 signed URL 로 redirect. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/backend/api/receipts/${receipt.id}/image`}
            alt="receipt"
            className="w-full rounded-md object-contain"
          />
        </div>

        {/* 편집 폼 */}
        <div className="space-y-5">
          {receipt.ocrError && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">OCR 실패</div>
                <div className="text-amber-800/80">{receipt.ocrError}</div>
              </div>
            </div>
          )}

          <Field label="가맹점">
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </Field>

          <Field label="총액 (원)">
            <input
              type="number"
              min={0}
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm tabular-nums focus:border-brand-500 focus:outline-none"
            />
            <div className="mt-1 text-xs text-slate-500">
              {formatKRW(Number(totalAmount) || 0)}
            </div>
          </Field>

          <Field label="구매일">
            <input
              type="date"
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
              className="w-full rounded-md border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </Field>

          <button
            onClick={onSave}
            disabled={!dirty || update.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            저장
          </button>
        </div>
      </div>

      {/* 품목 목록 */}
      {receipt.items && receipt.items.length > 0 && (
        <section className="mt-10 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">품목</h2>
          <ul className="mt-4 divide-y text-sm">
            {receipt.items.map((it) => (
              <li
                key={it.id}
                className="grid grid-cols-12 items-center gap-2 py-2"
              >
                <span className="col-span-7 truncate">{it.name}</span>
                <span className="col-span-2 text-right text-slate-500 tabular-nums">
                  × {it.quantity}
                </span>
                <span className="col-span-3 text-right tabular-nums font-medium">
                  {formatKRW(it.amount)}
                </span>
              </li>
            ))}
            <li className="grid grid-cols-12 items-center gap-2 pt-3 text-sm font-bold">
              <span className="col-span-9">합계</span>
              <span className="col-span-3 text-right tabular-nums">
                {formatKRW(receipt.totalAmount)}
              </span>
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "PENDING"
    | "PROCESSING"
    | "PARSED"
    | "CONFIRMED"
    | "FAILED";
}) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    PENDING: { label: "대기", cls: "bg-slate-100 text-slate-700" },
    PROCESSING: { label: "분석 중", cls: "bg-blue-100 text-blue-700" },
    PARSED: { label: "분석 완료", cls: "bg-green-100 text-green-700" },
    CONFIRMED: { label: "확정", cls: "bg-brand-50 text-brand-700" },
    FAILED: { label: "실패", cls: "bg-red-100 text-red-700" },
  } as const;
  const s = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
