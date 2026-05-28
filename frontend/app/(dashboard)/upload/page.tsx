"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";
import { useUploadReceipt } from "@/lib/hooks/receipts";
import { formatKRW, formatDate, cn } from "@/lib/utils";
import type { Receipt } from "@/lib/types";

type QueueStatus = "queued" | "uploading" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: QueueStatus;
  receipt?: Receipt;
  error?: string;
  ocrFailed?: boolean;
}

// Upstage 무료 티어 rate limit (분당 1회) 회피용. 429 시 자동 백오프.
const COOLDOWN_AFTER_RATE_LIMIT_MS = 65_000;

export default function UploadPage() {
  const upload = useUploadReceipt();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    const newItems: QueueItem[] = arr.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "queued",
    }));
    setItems((prev) => [...prev, ...newItems]);
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  function clearDone() {
    setItems((prev) => {
      for (const it of prev) {
        if (it.status === "done" || it.status === "error") {
          URL.revokeObjectURL(it.previewUrl);
        }
      }
      return prev.filter((x) => x.status !== "done" && x.status !== "error");
    });
  }

  // 미사용 미리보기 정리
  useEffect(() => {
    return () => {
      for (const it of items) URL.revokeObjectURL(it.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 큐 처리 루프: 다음 queued 항목을 1개씩 sequential 업로드
  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    const next = items.find((x) => x.status === "queued");
    if (!next) return;

    processingRef.current = true;
    setItems((prev) =>
      prev.map((x) => (x.id === next.id ? { ...x, status: "uploading" } : x)),
    );

    try {
      const res = await upload.mutateAsync(next.file);
      setItems((prev) =>
        prev.map((x) =>
          x.id === next.id
            ? {
                ...x,
                status: "done",
                receipt: res.receipt,
                ocrFailed: res.ocrFailed,
              }
            : x,
        ),
      );
    } catch (e: unknown) {
      // 429 / Too Many Requests 감지 → 큐를 중단하고 cooldown
      const msg = e instanceof Error ? e.message : String(e);
      const body = (e as { body?: unknown })?.body;
      const isRate =
        msg.includes("429") ||
        (typeof body === "object" &&
          body != null &&
          JSON.stringify(body).toLowerCase().includes("too_many_requests"));
      if (isRate) {
        setCooldownUntil(Date.now() + COOLDOWN_AFTER_RATE_LIMIT_MS);
        // 다시 큐로 되돌림
        setItems((prev) =>
          prev.map((x) =>
            x.id === next.id ? { ...x, status: "queued" } : x,
          ),
        );
      } else {
        setItems((prev) =>
          prev.map((x) =>
            x.id === next.id
              ? { ...x, status: "error", error: msg }
              : x,
          ),
        );
      }
    } finally {
      processingRef.current = false;
    }
  }, [items, cooldownUntil, upload]);

  // queued 항목이 생기면 자동 처리
  useEffect(() => {
    void processNext();
  }, [items, processNext]);

  // cooldown 끝나면 다시 시도
  useEffect(() => {
    if (!cooldownUntil) return;
    const remaining = cooldownUntil - Date.now();
    if (remaining <= 0) {
      setCooldownUntil(null);
      void processNext();
      return;
    }
    const t = setTimeout(() => {
      setCooldownUntil(null);
      void processNext();
    }, remaining);
    return () => clearTimeout(t);
  }, [cooldownUntil, processNext]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  const queuedCount = items.filter((x) => x.status === "queued").length;
  const doneCount = items.filter(
    (x) => x.status === "done" || x.status === "error",
  ).length;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">영수증 업로드</h1>
      <p className="mt-2 text-slate-600">
        여러 장을 한 번에 올려도 됩니다. Upstage AI가 가맹점·금액·날짜·품목·카테고리까지
        자동으로 분류합니다.
      </p>

      {/* 드롭 영역 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "mt-8 flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white transition",
          dragOver
            ? "border-brand-500 bg-brand-50/60"
            : "border-slate-300 hover:border-brand-500 hover:bg-brand-50/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Upload className="h-8 w-8 text-slate-500" />
        <p className="mt-2 text-sm text-slate-700">
          파일을 여기로 끌어다 놓거나 클릭해서 선택
        </p>
        <p className="text-xs text-slate-400">
          여러 장 가능 · JPG/PNG · 최대 10MB
        </p>
      </div>

      {cooldownUntil && (
        <CooldownBanner until={cooldownUntil} />
      )}

      {/* 큐 */}
      {items.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              업로드 큐 · 대기 {queuedCount} · 완료 {doneCount} / 전체{" "}
              {items.length}
            </h2>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="text-xs text-slate-500 hover:underline"
              >
                완료된 항목 지우기
              </button>
            )}
          </div>

          <ul className="mt-3 space-y-2">
            {items.map((it) => (
              <QueueRow key={it.id} item={it} onRemove={() => removeItem(it.id)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CooldownBanner({ until }: { until: number }) {
  const [remaining, setRemaining] = useState(Math.ceil((until - Date.now()) / 1000));
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (remaining <= 0) return null;
  return (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <Clock className="h-4 w-4" />
      <span>
        Upstage rate limit 회피를 위해 <b>{remaining}초</b> 대기 중. 큐는
        자동으로 이어집니다.
      </span>
    </div>
  );
}

function QueueRow({
  item,
  onRemove,
}: {
  item: QueueItem;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.previewUrl}
        alt=""
        className="h-14 w-14 shrink-0 rounded object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} ocrFailed={item.ocrFailed} />
          <span className="truncate text-sm font-medium">
            {item.receipt?.vendor ?? item.file.name}
          </span>
        </div>
        {item.status === "done" && item.receipt && (
          <div className="mt-1 text-xs text-slate-500">
            {formatKRW(item.receipt.totalAmount)} ·{" "}
            {formatDate(item.receipt.purchasedAt)} ·{" "}
            <Link
              href={`/receipts/${item.receipt.id}`}
              className="text-brand-600 hover:underline"
            >
              상세 →
            </Link>
          </div>
        )}
        {item.status === "error" && (
          <div className="mt-1 text-xs text-red-600">{item.error}</div>
        )}
      </div>
      {(item.status === "queued" || item.status === "error") && (
        <button
          onClick={onRemove}
          className="rounded p-1 text-slate-400 hover:bg-slate-100"
          title="제거"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function StatusBadge({
  status,
  ocrFailed,
}: {
  status: QueueStatus;
  ocrFailed?: boolean;
}) {
  if (status === "queued")
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        대기
      </span>
    );
  if (status === "uploading")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" /> 분석 중
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
        <AlertCircle className="h-3 w-3" /> 실패
      </span>
    );
  // done
  return ocrFailed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
      <AlertCircle className="h-3 w-3" /> 업로드만
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
      <CheckCircle2 className="h-3 w-3" /> 완료
    </span>
  );
}
