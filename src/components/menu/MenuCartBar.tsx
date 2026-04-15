"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { submitCoffeeSessionCart } from "@/lib/coffee-submit-cart-client";
import {
  basePriceForBoardGame,
  optionsExtraForLine,
} from "@/lib/menu-item-pricing";
import { formatPrice, cn } from "@/lib/utils";
import {
  buildSubmitCartPayload,
  selectCartTotalCount,
  useCoffeeCartStore,
  type LocalCartLine,
} from "@/stores/useCoffeeCartStore";
import type { FnbCategory, MenuItem } from "@/types";

interface MenuCartBarProps {
  items: MenuItem[];
  tableCode: string;
  insetBottomNav?: boolean;
}

const CATEGORY_LABEL: Record<FnbCategory, string> = {
  drink: "Đồ uống",
  snack: "Đồ ăn",
};

function IconCart() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function normalizeSelectBound(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.floor(value);
  return n >= 0 ? n : null;
}

function validateLineSelections(
  line: LocalCartLine,
  item: MenuItem,
): string | null {
  const optionGroups = item.options ?? [];
  if (optionGroups.length === 0) {
    if (line.selections?.length) {
      return `Mon "${item.name}" khong ho tro tuy chon, vui long bo selections.`;
    }
    return null;
  }

  const selections = line.selections ?? [];
  const byGroup = new Map<string, Set<string>>();
  for (const s of selections) {
    const group = optionGroups.find((g) => g.id === s.groupKey);
    if (!group) {
      return `Mon "${item.name}" co groupKey khong hop le: "${s.groupKey}".`;
    }
    const optionExists = group.choices.some((c) => c.id === s.optionKey);
    if (!optionExists) {
      return `Mon "${item.name}" co optionKey khong hop le: "${s.optionKey}" trong group "${s.groupKey}".`;
    }
    const cur = byGroup.get(s.groupKey) ?? new Set<string>();
    if (cur.has(s.optionKey)) {
      return `Mon "${item.name}" bi trung option "${s.optionKey}" trong group "${s.groupKey}".`;
    }
    cur.add(s.optionKey);
    byGroup.set(s.groupKey, cur);
  }

  for (const group of optionGroups) {
    const selectedCount = byGroup.get(group.id)?.size ?? 0;
    const minSelect = normalizeSelectBound(group.minSelect) ?? 0;
    const maxSelect =
      normalizeSelectBound(group.maxSelect) ?? Number.POSITIVE_INFINITY;
    if (selectedCount < minSelect) {
      return `Mon "${item.name}" chua du lua chon cho nhom "${group.name}" (toi thieu ${minSelect}).`;
    }
    if (selectedCount > maxSelect) {
      return `Mon "${item.name}" vuot so lua chon cho nhom "${group.name}" (toi da ${maxSelect}).`;
    }
  }

  return null;
}

function validateCartBeforeSubmit(
  lines: LocalCartLine[],
  itemById: Map<string, MenuItem>,
): string | null {
  for (const line of lines) {
    const item = itemById.get(line.itemId);
    if (!item) {
      return `Khong tim thay mon tuong ung itemId "${line.itemId}".`;
    }
    if (!item.isAvailable) {
      return `Mon "${item.name}" hien khong kha dung de dat.`;
    }
    const selectionError = validateLineSelections(line, item);
    if (selectionError) return selectionError;
  }
  return null;
}

function buildItemMap(items: MenuItem[]): Map<string, MenuItem> {
  const m = new Map<string, MenuItem>();
  for (const it of items) {
    m.set(it.id, it);
  }
  return m;
}

function estimateCartTotal(
  lines: LocalCartLine[],
  itemById: Map<string, MenuItem>,
): number {
  let total = 0;
  for (const line of lines) {
    const menuItem = itemById.get(line.itemId);
    if (!menuItem) continue;
    const unit =
      basePriceForBoardGame(menuItem) + optionsExtraForLine(menuItem, line);
    total += unit * line.quantity;
  }
  return total;
}

function formatSelectionDebug(
  line: LocalCartLine,
  menuItem: MenuItem | undefined,
): string {
  if (!line.selections?.length) return "";
  const optionGroups = menuItem?.options ?? [];
  return line.selections
    .map((s) => {
      const group = optionGroups.find((g) => g.id === s.groupKey);
      const choice = group?.choices.find((c) => c.id === s.optionKey);
      const groupText = group?.name ?? s.groupKey;
      const choiceText = choice?.label ?? s.optionKey;
      return `${groupText}: ${choiceText}`;
    })
    .join(" · ");
}

interface CartLineRowProps {
  line: LocalCartLine;
  menuItem: MenuItem | undefined;
  submitting: boolean;
  onDecrement: (line: LocalCartLine) => void;
  onIncrement: (line: LocalCartLine) => void;
}

function CartLineRow({
  line,
  menuItem,
  submitting,
  onDecrement,
  onIncrement,
}: CartLineRowProps) {
  const name = menuItem?.name ?? `Mon #${line.itemId.slice(-6)}`;
  const unit =
    basePriceForBoardGame(menuItem) + optionsExtraForLine(menuItem, line);
  const lineTotal = unit * line.quantity;
  const selectionText = formatSelectionDebug(line, menuItem);
  const canAddMore = menuItem?.isAvailable !== false;

  const handleMinus = () => {
    onDecrement(line);
  };

  const handlePlus = () => {
    onIncrement(line);
  };

  const minusLabel = line.quantity <= 1 ? "Xoa khoi gio" : "Giam so luong";

  return (
    <li className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {formatPrice(unit)} / mon ·{" "}
            <span className="capitalize">{CATEGORY_LABEL[line.category]}</span>
          </p>
          {line.note ? (
            <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
              {line.note}
            </p>
          ) : null}
          {selectionText ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {selectionText}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg font-bold active:bg-muted"
            disabled={submitting}
            aria-label={minusLabel}
            onClick={handleMinus}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {line.quantity}
          </span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-lg font-bold active:bg-muted"
            disabled={submitting || !canAddMore}
            onClick={handlePlus}
          >
            +
          </button>
        </div>
      </div>
      <p className="mt-2 text-right text-sm font-semibold text-primary tabular-nums">
        {menuItem ? formatPrice(lineTotal) : "—"}
      </p>
    </li>
  );
}

export function MenuCartBar({
  items,
  tableCode,
  insetBottomNav = false,
}: MenuCartBarProps) {
  const router = useRouter();
  const lines = useCoffeeCartStore((s) => s.lines);
  const setLineQty = useCoffeeCartStore((s) => s.setLineQty);
  const removeLine = useCoffeeCartStore((s) => s.removeLine);
  const clear = useCoffeeCartStore((s) => s.clear);
  const totalCount = useCoffeeCartStore(selectCartTotalCount);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const prevTableCode = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevTableCode.current;
    if (prev !== null && prev !== tableCode) {
      clear();
    }
    prevTableCode.current = tableCode;
  }, [tableCode, clear]);

  useEffect(() => {
    if (open && lines.length === 0) {
      setOpen(false);
    }
  }, [open, lines.length]);

  const itemById = useMemo(() => buildItemMap(items), [items]);

  const estimatedTotal = useMemo(
    () => estimateCartTotal(lines, itemById),
    [lines, itemById],
  );

  const openCart = useCallback(() => {
    setOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setOpen(false);
  }, []);

  const handleBackdropClose = useCallback(() => {
    if (submitting) return;
    closeCart();
  }, [submitting, closeCart]);

  const handleLineDecrement = useCallback(
    (line: LocalCartLine) => {
      if (line.quantity <= 1) {
        removeLine(line.lineId);
        return;
      }
      setLineQty(line.lineId, line.quantity - 1);
    },
    [removeLine, setLineQty],
  );

  const handleLineIncrement = useCallback(
    (line: LocalCartLine) => {
      setLineQty(line.lineId, line.quantity + 1);
    },
    [setLineQty],
  );

  const handleSubmit = useCallback(async () => {
    if (totalCount === 0 || submitting) return;
    const validationError = validateCartBeforeSubmit(lines, itemById);
    if (validationError) {
      window.alert(validationError);
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const cart = buildSubmitCartPayload(lines);
      const { ok, status, data } = await submitCoffeeSessionCart(cart);
      const payload = data as { sessionInvalid?: boolean; message?: string } | null;

      if (status === 401 && payload?.sessionInvalid) {
        await fetch("/api/client/coffee-sessions/clear", { method: "POST" });
        clear();
        closeCart();
        router.refresh();
        return;
      }

      if (ok) {
        clear();
        closeCart();
        setFeedback("Dat hang thanh cong!");
        window.setTimeout(() => setFeedback(null), 3200);
        router.replace(`/${encodeURIComponent(tableCode)}?tab=orders`);
        router.refresh();
        return;
      }

      const msg =
        (typeof payload?.message === "string" && payload.message) ||
        "Dat hang that bai, thu lai.";
      setFeedback(msg);
    } catch {
      setFeedback("Loi mang, thu lai.");
    } finally {
      setSubmitting(false);
    }
  }, [
    totalCount,
    submitting,
    lines,
    itemById,
    clear,
    closeCart,
    router,
    tableCode,
  ]);

  if (totalCount === 0 && !open && !feedback) {
    return null;
  }

  const dockBottomClass = insetBottomNav
    ? "bottom-[var(--app-tab-bar)]"
    : "bottom-0";

  return (
    <>
      {feedback ? (
        <div
          className={cn(
            "fixed left-1/2 z-90 max-w-[min(100%-2rem,28rem)] -translate-x-1/2 rounded-xl px-4 py-2 text-center text-sm shadow-lg",
            insetBottomNav
              ? "bottom-[calc(var(--app-tab-bar)+5.5rem)]"
              : "bottom-22",
            feedback.includes("thanh cong")
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-destructive-foreground",
          )}
          role="status"
        >
          {feedback}
        </div>
      ) : null}

      {!open && totalCount > 0 ? (
        <div
          className={cn(
            "fixed left-0 right-0 z-45 border-t border-border bg-background/95 p-3 backdrop-blur supports-backdrop-filter:bg-background/80",
            dockBottomClass,
            !insetBottomNav && "pb-safe",
          )}
        >
          <div className="mx-auto flex max-w-md items-center gap-3">
            <button
              type="button"
              onClick={openCart}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-left transition-colors active:bg-muted"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <IconCart />
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                  {totalCount > 99 ? "99+" : totalCount}
                </span>
              </span>
            </button>
            <Button
              size="lg"
              className="shrink-0 px-4"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Dang gui..." : "Confirm"}
            </Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-100 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleBackdropClose}
            aria-hidden
          />
          <div className="relative flex h-[94dvh] w-full max-w-md flex-col rounded-t-3xl bg-background pb-safe shadow-2xl animate-slide-up">
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>
            <div className="flex items-center justify-between border-b border-border px-4 pb-3">
              <h2 className="text-lg font-bold">Gio hang</h2>
              <button
                type="button"
                className="text-sm text-muted-foreground"
                disabled={submitting}
                onClick={closeCart}
              >
                Dong
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {lines.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Gio trong
                </p>
              ) : (
                <ul className="space-y-3">
                  {lines.map((line) => (
                    <CartLineRow
                      key={line.lineId}
                      line={line}
                      menuItem={itemById.get(line.itemId)}
                      submitting={submitting}
                      onDecrement={handleLineDecrement}
                      onIncrement={handleLineIncrement}
                    />
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tam tinh</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(estimatedTotal)}
                </span>
              </div>
              <Button
                size="lg"
                className="w-full"
                disabled={lines.length === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Dang gui..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
