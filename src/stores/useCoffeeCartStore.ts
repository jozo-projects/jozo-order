import { create } from "zustand";
import type {
  CartSelection,
  CoffeeSessionSubmitCartRequest,
  CoffeeSubmitCartLine,
  FnbCategory,
  MenuItem,
} from "@/types";

export type LocalCartLine = CoffeeSubmitCartLine & { lineId: string };

function newLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `l_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function menuCategoryToFnb(categoryId: string): FnbCategory {
  return categoryId === "drink" ? "drink" : "snack";
}

function stableSelectionsKey(selections?: CartSelection[]): string {
  if (!selections?.length) return "";
  return [...selections]
    .slice()
    .sort(
      (a, b) =>
        a.groupKey.localeCompare(b.groupKey) ||
        a.optionKey.localeCompare(b.optionKey),
    )
    .map((s) => `${s.groupKey}:${s.optionKey}`)
    .join("|");
}

function mergeKey(
  itemId: string,
  category: FnbCategory,
  note: string | undefined,
  selections: CartSelection[] | undefined,
): string {
  return `${itemId}\0${category}\0${(note ?? "").trim()}\0${stableSelectionsKey(selections)}`;
}

export interface CoffeeCartState {
  lines: LocalCartLine[];
  /** Them mon: gop SL neu trung itemId+category+note+selections. */
  addFromMenu: (
    item: MenuItem,
    extra?: { note?: string; selections?: CartSelection[]; quantity?: number },
  ) => void;
  setLineQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clear: () => void;
}

function normalizeQty(q: number): number {
  if (!Number.isFinite(q)) return 1;
  const n = Math.floor(q);
  return n >= 1 ? n : 1;
}

export const useCoffeeCartStore = create<CoffeeCartState>((set) => ({
  lines: [],
  addFromMenu: (item, extra) => {
    if (!item.isAvailable) return;
    const category = menuCategoryToFnb(item.categoryId);
    const note = extra?.note?.trim() ? extra.note.trim() : undefined;
    const selections =
      extra?.selections?.filter(
        (s) => s.groupKey.trim() !== "" && s.optionKey.trim() !== "",
      ) ?? undefined;
    const qtyAdd = normalizeQty(extra?.quantity ?? 1);
    const key = mergeKey(item.id, category, note, selections);

    set((state) => {
      const idx = state.lines.findIndex(
        (l) =>
          mergeKey(l.itemId, l.category, l.note, l.selections) === key,
      );
      if (idx >= 0) {
        const next = state.lines.slice();
        const cur = next[idx]!;
        next[idx] = {
          ...cur,
          quantity: cur.quantity + qtyAdd,
        };
        return { lines: next };
      }
      const line: LocalCartLine = {
        lineId: newLineId(),
        itemId: item.id,
        category,
        quantity: qtyAdd,
        ...(note ? { note } : {}),
        ...(selections?.length ? { selections } : {}),
      };
      return { lines: [...state.lines, line] };
    });
  },
  setLineQty: (lineId, qty) => {
    const n = Math.floor(qty);
    set((state) => {
      if (n <= 0) {
        return { lines: state.lines.filter((l) => l.lineId !== lineId) };
      }
      return {
        lines: state.lines.map((l) =>
          l.lineId === lineId ? { ...l, quantity: n } : l,
        ),
      };
    });
  },
  removeLine: (lineId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.lineId !== lineId),
    })),
  clear: () => set({ lines: [] }),
}));

export function selectCartTotalCount(state: CoffeeCartState): number {
  return state.lines.reduce((a, l) => a + l.quantity, 0);
}

/** Payload gui len BFF: lines + legacy maps rong. */
export function buildSubmitCartPayload(
  lines: LocalCartLine[],
): CoffeeSessionSubmitCartRequest["cart"] {
  const wireLines: CoffeeSubmitCartLine[] = lines.map(
    ({ lineId, itemId, category, quantity, note, selections }) => {
      const line: CoffeeSubmitCartLine = {
        itemId,
        category,
        quantity,
      };
      if (lineId) line.lineId = lineId;
      if (note) line.note = note.slice(0, 2000);
      if (selections?.length) line.selections = selections;
      return line;
    },
  );
  return {
    lines: wireLines,
    drinks: {},
    snacks: {},
  };
}
