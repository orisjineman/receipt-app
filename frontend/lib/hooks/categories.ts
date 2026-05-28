"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";
import type { Category } from "../types";

const keys = {
  all: ["categories"] as const,
  list: () => [...keys.all, "list"] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => api<{ categories: Category[] }>("/api/categories"),
    select: (data) => data.categories,
  });
}

export interface CategoryUpsertInput {
  name: string;
  color?: string;
  icon?: string;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryUpsertInput) =>
      api<{ category: Category }>("/api/categories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: CategoryUpsertInput & { id: string }) =>
      api<{ category: Category }>(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.list() });
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}
