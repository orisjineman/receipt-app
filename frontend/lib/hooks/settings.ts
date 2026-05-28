"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";
import type { Setting } from "../types";

const key = ["setting"] as const;

export function useSetting() {
  return useQuery({
    queryKey: key,
    queryFn: () => api<{ setting: Setting }>("/api/settings"),
    select: (data) => data.setting,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { monthlyBudget?: number | null }) =>
      api<{ setting: Setting }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
  });
}
