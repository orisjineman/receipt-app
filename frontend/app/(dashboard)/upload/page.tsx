"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useUploadReceipt } from "@/lib/hooks/receipts";
import { formatKRW, formatDate } from "@/lib/utils";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const upload = useUploadReceipt();

  function pick(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
    upload.reset();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    upload.mutate(file);
  }

  const receipt = upload.data?.receipt;
  const ocrFailed = upload.data?.ocrFailed;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">영수증 업로드</h1>
      <p className="mt-2 text-slate-600">
        영수증 사진을 올리면 Upstage AI가 가맹점·금액·날짜·품목을 자동으로
        추출합니다.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <label className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white hover:border-brand-500 hover:bg-brand-50/40">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="preview"
              className="h-full w-full rounded-lg object-contain p-2"
            />
          ) : (
            <div className="flex flex-col items-center text-slate-500">
              <Upload className="h-8 w-8" />
              <span className="mt-2 text-sm">
                여기를 클릭하거나 파일을 드래그
              </span>
              <span className="text-xs text-slate-400">
                JPG / PNG · 최대 10MB
              </span>
            </div>
          )}
        </label>

        <button
          type="submit"
          disabled={!file || upload.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {upload.isPending ? "분석 중 (5~10초)..." : "업로드 및 분석"}
        </button>
      </form>

      {upload.isError && (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">업로드 실패</div>
            <div className="mt-1 text-red-700/80">
              {upload.error instanceof Error
                ? upload.error.message
                : "알 수 없는 오류"}
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            {ocrFailed ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span className="font-medium">
                  업로드는 됐지만 OCR에 실패했습니다
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">추출 완료</span>
              </>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <dt className="text-slate-500">가맹점</dt>
            <dd className="font-medium">{receipt.vendor ?? "-"}</dd>
            <dt className="text-slate-500">총액</dt>
            <dd className="font-medium">{formatKRW(receipt.totalAmount)}</dd>
            <dt className="text-slate-500">날짜</dt>
            <dd className="font-medium">{formatDate(receipt.purchasedAt)}</dd>
            <dt className="text-slate-500">품목 수</dt>
            <dd className="font-medium">{receipt.items?.length ?? 0}</dd>
          </dl>

          {receipt.items && receipt.items.length > 0 && (
            <ul className="mt-4 divide-y rounded-md border text-sm">
              {receipt.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span>
                    {it.name}{" "}
                    {it.quantity > 1 && (
                      <span className="text-slate-400">× {it.quantity}</span>
                    )}
                  </span>
                  <span className="tabular-nums">{formatKRW(it.amount)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex gap-2">
            <Link
              href={`/receipts/${receipt.id}`}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              상세 보기 / 수정
            </Link>
            <button
              type="button"
              onClick={() => pick(null)}
              className="rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              새 영수증 올리기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
