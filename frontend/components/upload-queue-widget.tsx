"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { useUploadQueue } from "@/lib/upload-queue";

/**
 * 우하단 플로팅 큐 진행 상황 위젯.
 * /upload 페이지에서는 (페이지 내에 동일 정보가 있으므로) 숨긴다.
 */
export function UploadQueueWidget() {
  const pathname = usePathname();
  const { items, cooldownUntil } = useUploadQueue();

  if (pathname === "/upload") return null;
  if (items.length === 0) return null;

  const current = items.find((x) => x.status === "uploading");
  const queued = items.filter((x) => x.status === "queued").length;
  const done = items.filter((x) => x.status === "done").length;
  const errored = items.filter((x) => x.status === "error").length;

  return (
    <Link
      href="/upload"
      className="fixed bottom-6 right-6 z-50 w-72 rounded-xl border bg-white p-3 shadow-lg ring-1 ring-black/5 transition hover:shadow-xl"
    >
      <div className="flex items-center gap-2">
        {current ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        ) : cooldownUntil ? (
          <Clock className="h-4 w-4 text-amber-600" />
        ) : queued > 0 ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
        <div className="flex-1 text-sm font-semibold">
          {cooldownUntil
            ? "Rate limit 대기 중"
            : current
              ? "분석 중..."
              : queued > 0
                ? "대기 중"
                : "업로드 완료"}
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {done + errored}/{items.length}
        </span>
      </div>

      {current && (
        <div className="mt-2 truncate text-xs text-slate-500">
          {current.file.name}
        </div>
      )}

      {cooldownUntil && <Countdown until={cooldownUntil} />}

      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
        <span>대기 {queued}</span>
        <span className="text-green-700">완료 {done}</span>
        {errored > 0 && (
          <span className="inline-flex items-center gap-0.5 text-red-700">
            <AlertCircle className="h-3 w-3" />
            실패 {errored}
          </span>
        )}
        <span className="ml-auto text-brand-600 hover:underline">
          큐 열기 →
        </span>
      </div>
    </Link>
  );
}

function Countdown({ until }: { until: number }) {
  const [remaining, setRemaining] = useState(
    Math.ceil((until - Date.now()) / 1000),
  );
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [until]);
  if (remaining <= 0) return null;
  return (
    <div className="mt-1 text-xs text-amber-700">{remaining}초 후 자동 재개</div>
  );
}
