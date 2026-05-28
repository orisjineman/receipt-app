"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";
import type {
  Receipt,
  ReceiptListResponse,
  ReceiptOneResponse,
} from "../types";

const keys = {
  all: ["receipts"] as const,
  list: () => [...keys.all, "list"] as const,
  one: (id: string) => [...keys.all, "one", id] as const,
};

export function useReceipts() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => api<ReceiptListResponse>("/api/receipts"),
    select: (data) => data.receipts,
  });
}

export function useReceipt(id: string) {
  return useQuery({
    queryKey: keys.one(id),
    queryFn: () => api<ReceiptOneResponse>(`/api/receipts/${id}`),
    select: (data) => data.receipt,
    enabled: Boolean(id),
  });
}

export function useUploadReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      return api<ReceiptOneResponse>("/api/receipts", {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() });
    },
  });
}

export interface ReceiptPatchInput {
  vendor?: string;
  totalAmount?: number;
  purchasedAt?: string; // ISO date
}

export function useUpdateReceipt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReceiptPatchInput) =>
      api<{ receipt: Receipt }>(`/api/receipts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.one(id) });
      qc.invalidateQueries({ queryKey: keys.list() });
    },
  });
}

export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/receipts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() });
    },
  });
}
