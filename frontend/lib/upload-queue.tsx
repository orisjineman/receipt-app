"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useUploadReceipt } from "@/lib/hooks/receipts";
import type { Receipt } from "@/lib/types";

export type QueueStatus = "queued" | "uploading" | "done" | "error";

export interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: QueueStatus;
  receipt?: Receipt;
  error?: string;
  ocrFailed?: boolean;
}

interface UploadQueueContextValue {
  items: QueueItem[];
  cooldownUntil: number | null;
  addFiles: (files: FileList | File[] | null) => void;
  removeItem: (id: string) => void;
  clearDone: () => void;
}

const Ctx = createContext<UploadQueueContextValue | null>(null);

// Upstage 무료 티어 rate limit 회피용 백오프 (429 응답 시)
const COOLDOWN_AFTER_RATE_LIMIT_MS = 65_000;

/**
 * 업로드 큐 Context.
 * dashboard layout 에 한 번만 mount 되어 라우트 이동에도 살아남는다.
 * /upload 페이지가 떠나도 백그라운드 처리가 계속 진행되고,
 * 다른 페이지에서는 플로팅 위젯으로 상태가 노출된다.
 */
export function UploadQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const processingRef = useRef(false);
  const upload = useUploadReceipt();

  const addFiles = useCallback((files: FileList | File[] | null) => {
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
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it) URL.revokeObjectURL(it.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const clearDone = useCallback(() => {
    setItems((prev) => {
      for (const it of prev) {
        if (it.status === "done" || it.status === "error") {
          URL.revokeObjectURL(it.previewUrl);
        }
      }
      return prev.filter((x) => x.status !== "done" && x.status !== "error");
    });
  }, []);

  // 큐 처리 루프: 다음 queued 항목을 1개씩 sequential 업로드
  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    const next = items.find((x) => x.status === "queued");
    if (!next) return;

    processingRef.current = true;
    setItems((prev) =>
      prev.map((x) =>
        x.id === next.id ? { ...x, status: "uploading" } : x,
      ),
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

  const value = useMemo(
    () => ({ items, cooldownUntil, addFiles, removeItem, clearDone }),
    [items, cooldownUntil, addFiles, removeItem, clearDone],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUploadQueue() {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useUploadQueue must be used within UploadQueueProvider");
  }
  return v;
}
