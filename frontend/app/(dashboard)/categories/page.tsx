"use client";

import { useState } from "react";
import { Plus, Trash2, Check, X, Loader2, Pencil } from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/lib/hooks/categories";
import { useReceipts } from "@/lib/hooks/receipts";
import { formatKRW } from "@/lib/utils";

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#94a3b8", // slate (default)
];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const { data: receipts } = useReceipts();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const del = useDeleteCategory();

  const [editing, setEditing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  // 카테고리별 사용 통계 (영수증 수 / 누적 금액)
  const stats = new Map<string, { count: number; total: number }>();
  for (const r of receipts ?? []) {
    if (!r.categoryId) continue;
    const cur = stats.get(r.categoryId) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += r.totalAmount ?? 0;
    stats.set(r.categoryId, cur);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await create.mutateAsync({ name: newName.trim(), color: newColor });
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">카테고리</h1>
      <p className="mt-2 text-slate-600">
        영수증을 분류할 카테고리를 직접 관리합니다.
      </p>

      {/* 새 카테고리 만들기 */}
      <form
        onSubmit={handleCreate}
        className="mt-8 rounded-xl border bg-white p-5 shadow-sm"
      >
        <div className="text-sm font-medium">새 카테고리</div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="예: 식비, 교통, 카페..."
            className="flex-1 min-w-[180px] rounded-md border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            maxLength={40}
          />
          <ColorPicker value={newColor} onChange={setNewColor} />
          <button
            type="submit"
            disabled={!newName.trim() || create.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            추가
          </button>
        </div>
      </form>

      {/* 카테고리 목록 */}
      <div className="mt-8 rounded-xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">불러오는 중...</div>
        ) : !categories || categories.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            아직 카테고리가 없습니다. 위에서 첫 카테고리를 추가하세요.
          </div>
        ) : (
          <ul className="divide-y">
            {categories.map((c) => {
              const s = stats.get(c.id);
              const isEdit = editing === c.id;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  {isEdit ? (
                    <EditRow
                      initial={c}
                      onCancel={() => setEditing(null)}
                      onSave={async (data) => {
                        await update.mutateAsync({ id: c.id, ...data });
                        setEditing(null);
                      }}
                    />
                  ) : (
                    <>
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {s ? `${s.count}건 · ${formatKRW(s.total)}` : "사용 안 함"}
                      </span>
                      <button
                        onClick={() => setEditing(c.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="수정"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (s && s.count > 0) {
                            if (
                              !confirm(
                                `이 카테고리에 ${s.count}건의 영수증이 연결되어 있습니다.\n삭제하면 영수증의 카테고리가 해제됩니다. 진행할까요?`,
                              )
                            )
                              return;
                          } else if (!confirm("이 카테고리를 삭제할까요?")) {
                            return;
                          }
                          await del.mutateAsync(c.id);
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          className={`h-7 w-7 rounded-full ring-offset-2 transition ${
            value === c ? "ring-2 ring-slate-900" : "hover:scale-110"
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function EditRow({
  initial,
  onCancel,
  onSave,
}: {
  initial: { name: string; color: string };
  onCancel: () => void;
  onSave: (data: { name: string; color: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [saving, setSaving] = useState(false);

  return (
    <>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-md border bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        maxLength={40}
      />
      <ColorPicker value={color} onChange={setColor} />
      <button
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ name: name.trim(), color });
          } finally {
            setSaving(false);
          }
        }}
        disabled={!name.trim() || saving}
        className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50"
        title="저장"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={onCancel}
        className="rounded p-1 text-slate-400 hover:bg-slate-100"
        title="취소"
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
}
