"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CoffeeSessionOrderLineItem,
  FNBOrderSelection,
  MenuItem,
} from "@/types";
import { submitCoffeeSessionCart } from "@/lib/coffee-submit-cart-client";
import { formatSelectionLabels } from "@/lib/menu-selection-labels";
import {
  basePriceForBoardGame,
  optionsExtraForLine,
} from "@/lib/menu-item-pricing";
import { Button } from "@/components/ui/Button";
import { formatPrice, cn } from "@/lib/utils";
import {
  buildSubmitCartPayload,
  useCoffeeCartStore,
} from "@/stores/useCoffeeCartStore";

function numField(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickLineItemId(o: Record<string, unknown>): string | undefined {
  for (const k of [
    "menuItemId",
    "menu_item_id",
    "itemId",
    "item_id",
    "productId",
    "product_id",
  ] as const) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

function parseOrderLineItem(raw: unknown): CoffeeSessionOrderLineItem | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const qty = numField(o.quantity ?? o.qty);
  if (qty == null || qty <= 0) return null;

  const listUnit = numField(o.listUnitPrice ?? o.list_unit_price) ?? 0;
  const chargedUnit = numField(o.chargedUnitPrice ?? o.charged_unit_price) ?? 0;
  const lineList =
    numField(o.lineListTotal ?? o.line_list_total) ?? qty * listUnit;
  const lineCharged =
    numField(o.lineChargedTotal ?? o.line_charged_total) ?? qty * chargedUnit;

  const name = typeof o.name === "string" ? o.name : undefined;
  const note =
    typeof o.note === "string" && o.note.trim().length > 0
      ? o.note.trim()
      : undefined;
  const id = pickLineItemId(o);
  const selections = parseLineSelections(o.selections);

  return {
    menuItemId: id,
    itemId: id,
    name,
    ...(note ? { note } : {}),
    quantity: qty,
    listUnitPrice: listUnit,
    lineListTotal: lineList,
    chargedUnitPrice: chargedUnit,
    lineChargedTotal: lineCharged,
    ...(selections?.length ? { selections } : {}),
  };
}

function parseLineSelections(raw: unknown): FNBOrderSelection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const selections = raw
    .map((entry) => {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const obj = entry as Record<string, unknown>;
      const groupKey =
        typeof obj.groupKey === "string" ? obj.groupKey.trim() : "";
      const optionKey =
        typeof obj.optionKey === "string" ? obj.optionKey.trim() : "";
      if (!groupKey || !optionKey) return null;
      return { groupKey, optionKey };
    })
    .filter((x): x is FNBOrderSelection => x != null);
  return selections.length > 0 ? selections : undefined;
}

/** Lay `result.order.lineItems`/`result.order.lines` tu GET /client/coffee-sessions/me. */
function trySessionLineItems(me: unknown): CoffeeSessionOrderLineItem[] {
  if (me == null || typeof me !== "object" || Array.isArray(me)) return [];
  const root = me as Record<string, unknown>;
  const layers: Record<string, unknown>[] = [];
  if (
    root.result &&
    typeof root.result === "object" &&
    !Array.isArray(root.result)
  ) {
    layers.push(root.result as Record<string, unknown>);
  }
  for (const key of ["data", "session"] as const) {
    const x = root[key];
    if (x && typeof x === "object" && !Array.isArray(x)) {
      layers.push(x as Record<string, unknown>);
    }
  }
  for (const layer of layers) {
    const wrap = layer.order;
    if (wrap == null || typeof wrap !== "object" || Array.isArray(wrap))
      continue;
    const wrapRecord = wrap as Record<string, unknown>;
    const wrappedOrder = wrapRecord.order;
    const wrappedOrderLines =
      wrappedOrder &&
      typeof wrappedOrder === "object" &&
      !Array.isArray(wrappedOrder)
        ? (wrappedOrder as Record<string, unknown>).lines
        : null;
    const itemsRaw = Array.isArray(wrapRecord.lineItems)
      ? wrapRecord.lineItems
      : Array.isArray(wrapRecord.lines)
        ? wrapRecord.lines
        : Array.isArray(wrappedOrderLines)
          ? wrappedOrderLines
          : null;
    if (!itemsRaw) continue;
    const parsed = itemsRaw
      .map(parseOrderLineItem)
      .filter((x): x is CoffeeSessionOrderLineItem => x != null);
    if (parsed.length > 0) return parsed;
  }
  return [];
}

function tryOrders(me: unknown): unknown[] {
  if (me == null) return [];
  if (Array.isArray(me)) return me;
  if (typeof me === "object") {
    const o = me as Record<string, unknown>;
    if (Array.isArray(o.orders)) return o.orders;
    if (Array.isArray(o.data)) return o.data;
    if (typeof o.data === "object" && o.data && !Array.isArray(o.data)) {
      const d = o.data as Record<string, unknown>;
      if (Array.isArray(d.orders)) return d.orders;
    }
    if (Array.isArray(o.items)) return o.items;
    const result = o.result;
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const ordWrap = (result as Record<string, unknown>).order;
      if (ordWrap && typeof ordWrap === "object" && !Array.isArray(ordWrap)) {
        const h = (ordWrap as Record<string, unknown>).history;
        if (Array.isArray(h) && h.length > 0) return h;
      }
    }
  }
  return [];
}

function normQtyMap(m: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

function pickDrinksSnacksObject(c: Record<string, unknown>): {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
} | null {
  const drinks = c.drinks;
  const snacks = c.snacks;
  if (
    typeof drinks !== "object" ||
    drinks == null ||
    Array.isArray(drinks) ||
    typeof snacks !== "object" ||
    snacks == null ||
    Array.isArray(snacks)
  ) {
    return null;
  }
  return {
    drinks: normQtyMap(drinks as Record<string, unknown>),
    snacks: normQtyMap(snacks as Record<string, unknown>),
  };
}

/** `cart: { drinks, snacks }` hoac legacy. */
function pickCartFromRecord(obj: Record<string, unknown>): {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
} | null {
  const raw = obj.cart;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return pickDrinksSnacksObject(raw as Record<string, unknown>);
}

/** `order: { _id, order: { drinks, snacks } }` (GET /client/coffee-sessions/me). */
function pickCartFromSessionOrderWrapper(obj: Record<string, unknown>): {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
} | null {
  const wrapper = obj.order;
  if (
    wrapper == null ||
    typeof wrapper !== "object" ||
    Array.isArray(wrapper)
  ) {
    return null;
  }
  const inner = (wrapper as Record<string, unknown>).order;
  if (inner == null || typeof inner !== "object" || Array.isArray(inner)) {
    return null;
  }
  return pickDrinksSnacksObject(inner as Record<string, unknown>);
}

function tryServerCart(me: unknown): {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
} | null {
  if (me == null || typeof me !== "object" || Array.isArray(me)) return null;
  const o = me as Record<string, unknown>;
  const topCart = pickCartFromRecord(o);
  if (topCart) return topCart;
  const topOrder = pickCartFromSessionOrderWrapper(o);
  if (topOrder) return topOrder;
  for (const key of ["data", "result", "session"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const rec = inner as Record<string, unknown>;
      const nestedCart = pickCartFromRecord(rec);
      if (nestedCart) return nestedCart;
      const nestedOrder = pickCartFromSessionOrderWrapper(rec);
      if (nestedOrder) return nestedOrder;
    }
  }
  return null;
}

function tryPeopleCount(me: unknown): number {
  if (me == null || typeof me !== "object" || Array.isArray(me)) return 0;
  const root = me as Record<string, unknown>;
  const layers: Record<string, unknown>[] = [root];
  for (const key of ["data", "result", "session"] as const) {
    const x = root[key];
    if (x && typeof x === "object" && !Array.isArray(x)) {
      layers.push(x as Record<string, unknown>);
    }
  }
  for (const layer of layers) {
    const n = numField(layer.peopleCount ?? layer.people_count);
    if (n != null && n > 0) return Math.floor(n);
  }
  return 0;
}

type SessionOrderTotals = {
  fnbChargedTotal: number;
  fnbListTotal: number;
};

function trySessionOrderTotals(me: unknown): SessionOrderTotals | null {
  if (me == null || typeof me !== "object" || Array.isArray(me)) return null;
  const root = me as Record<string, unknown>;
  const layers: Record<string, unknown>[] = [];
  if (
    root.result &&
    typeof root.result === "object" &&
    !Array.isArray(root.result)
  ) {
    layers.push(root.result as Record<string, unknown>);
  }
  for (const key of ["data", "session"] as const) {
    const x = root[key];
    if (x && typeof x === "object" && !Array.isArray(x)) {
      layers.push(x as Record<string, unknown>);
    }
  }

  for (const layer of layers) {
    const wrap = layer.order;
    if (wrap == null || typeof wrap !== "object" || Array.isArray(wrap)) {
      continue;
    }
    const totals = (wrap as Record<string, unknown>).orderTotals;
    if (totals == null || typeof totals !== "object" || Array.isArray(totals)) {
      continue;
    }
    const totalsObj = totals as Record<string, unknown>;
    const charged = numField(
      totalsObj.fnbChargedTotal ?? totalsObj.fnb_charged_total,
    );
    const list = numField(totalsObj.fnbListTotal ?? totalsObj.fnb_list_total);
    if (charged == null && list == null) continue;
    return {
      fnbChargedTotal: charged ?? 0,
      fnbListTotal: list ?? 0,
    };
  }

  return null;
}

function orderLine(o: unknown, index: number): string {
  if (o == null) return `Don ${index + 1}`;
  if (typeof o === "string" || typeof o === "number") return String(o);
  if (typeof o === "object") {
    const x = o as Record<string, unknown>;
    const code = x.code ?? x.id ?? x._id;
    const status = x.status;
    const total = x.totalAmount ?? x.total;
    const parts: string[] = [];
    if (code != null) parts.push(String(code));
    if (status != null) parts.push(String(status));
    if (total != null) parts.push(String(total));
    if (parts.length) return parts.join(" · ");
  }
  return `Don ${index + 1}`;
}

function pureLineItemName(rawName: string | undefined): string | undefined {
  if (!rawName) return undefined;
  const trimmed = rawName.trim();
  if (!trimmed) return undefined;
  const head = trimmed.split(" · ")[0]?.trim();
  return head || undefined;
}

type CartLine = { itemId: string; categoryId: string; qty: number };
type PricedCartLine = CartLine & { chargedQty: number };

function cartLinesFromMaps(cart: {
  drinks: Record<string, number>;
  snacks: Record<string, number>;
}): CartLine[] {
  const out: CartLine[] = [];
  for (const [itemId, qty] of Object.entries(cart.drinks)) {
    if (qty > 0) out.push({ itemId, categoryId: "drink", qty });
  }
  for (const [itemId, qty] of Object.entries(cart.snacks)) {
    if (qty > 0) out.push({ itemId, categoryId: "snack", qty });
  }
  return out;
}

function cartQtyTotal(lines: CartLine[]): number {
  return lines.reduce((a, l) => a + l.qty, 0);
}

/** So hien thi tren tab Don (don + tong so mon trong gio server). */
export function getCoffeeMeTabBadgeCount(data: unknown): number {
  const orders = tryOrders(data).length;
  const li = trySessionLineItems(data);
  if (li.length > 0) {
    return orders + li.reduce((a, x) => a + x.quantity, 0);
  }
  const serverCart = tryServerCart(data);
  const lines = serverCart ? cartLinesFromMaps(serverCart) : [];
  const q = cartQtyTotal(lines);
  return orders + q;
}

interface CoffeeSessionMePanelProps {
  data: unknown;
  menuItems?: MenuItem[];
  tableCode: string;
  checkoutIntent?: boolean;
  className?: string;
}

/** Noi dung man hinh Don cua toi (GET /client/coffee-sessions/me). */
export function CoffeeSessionMePanel({
  data,
  menuItems = [],
  tableCode,
  checkoutIntent = false,
  className,
}: CoffeeSessionMePanelProps) {
  const router = useRouter();
  const localCartLines = useCoffeeCartStore((s) => s.lines);
  const clearLocalCart = useCoffeeCartStore((s) => s.clear);
  const [submittingLocalCheckout, setSubmittingLocalCheckout] = useState(false);
  const [localCheckoutFeedback, setLocalCheckoutFeedback] = useState<
    string | null
  >(null);
  const orders = tryOrders(data);
  const serverCart = tryServerCart(data);
  const peopleCount = useMemo(() => tryPeopleCount(data), [data]);
  const lineItems = useMemo(() => trySessionLineItems(data), [data]);
  const useLineItems = lineItems.length > 0;
  const orderTotals = useMemo(() => trySessionOrderTotals(data), [data]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.log("[orders-tab] raw data", data);
  }, [data]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!useLineItems) return;
    console.log("[orders-tab] parsed lineItems", lineItems);
  }, [lineItems, useLineItems]);

  const itemById = useMemo(() => {
    const m = new Map<string, MenuItem>();
    for (const it of menuItems) m.set(it.id, it);
    return m;
  }, [menuItems]);

  const cartLines = useMemo(
    () => (serverCart ? cartLinesFromMaps(serverCart) : []),
    [serverCart],
  );

  const pricedCartLines = useMemo<PricedCartLine[]>(() => {
    const initialRemaining = Math.max(0, Math.floor(peopleCount));
    const acc = cartLines.reduce<{
      remaining: number;
      lines: PricedCartLine[];
    }>(
      (state, line) => {
        if (line.categoryId !== "drink") {
          return {
            remaining: state.remaining,
            lines: [...state.lines, { ...line, chargedQty: line.qty }],
          };
        }
        const freeApplied = Math.min(line.qty, state.remaining);
        const nextRemaining = state.remaining - freeApplied;
        return {
          remaining: nextRemaining,
          lines: [
            ...state.lines,
            { ...line, chargedQty: Math.max(0, line.qty - freeApplied) },
          ],
        };
      },
      { remaining: initialRemaining, lines: [] },
    );
    return acc.lines;
  }, [cartLines, peopleCount]);

  const cartTotalMenu = useMemo(() => {
    let t = 0;
    for (const line of pricedCartLines) {
      const it = itemById.get(line.itemId);
      if (it) t += basePriceForBoardGame(it) * line.chargedQty;
    }
    return t;
  }, [pricedCartLines, itemById]);

  const listTotalSum = useMemo(
    () => lineItems.reduce((a, l) => a + l.lineListTotal, 0),
    [lineItems],
  );
  const chargedTotalSum = useMemo(
    () => lineItems.reduce((a, l) => a + l.lineChargedTotal, 0),
    [lineItems],
  );
  const listTotalDisplay = orderTotals?.fnbListTotal ?? listTotalSum;
  const chargedTotalDisplay = orderTotals?.fnbChargedTotal ?? chargedTotalSum;

  const hasCart = useLineItems || cartLines.length > 0;
  const hasOrders = orders.length > 0;
  const hasLocalCart = localCartLines.length > 0;

  const localCheckoutRows = useMemo(
    () =>
      localCartLines.map((line) => {
        const item = itemById.get(line.itemId);
        const unit =
          basePriceForBoardGame(item) + optionsExtraForLine(item, line);
        const selectionText = formatSelectionLabels(line.selections, item);
        return {
          line,
          item,
          unit,
          lineTotal: unit * line.quantity,
          selectionText,
        };
      }),
    [localCartLines, itemById],
  );

  const localCheckoutTotal = useMemo(
    () => localCheckoutRows.reduce((sum, row) => sum + row.lineTotal, 0),
    [localCheckoutRows],
  );

  const handleConfirmLocalCheckout = async () => {
    if (!hasLocalCart || submittingLocalCheckout) return;
    setSubmittingLocalCheckout(true);
    setLocalCheckoutFeedback(null);
    try {
      const cart = buildSubmitCartPayload(localCartLines);
      const {
        ok,
        status,
        data: payloadData,
      } = await submitCoffeeSessionCart(cart);
      const payload = payloadData as {
        sessionInvalid?: boolean;
        message?: string;
      } | null;

      if (status === 401 && payload?.sessionInvalid) {
        await fetch("/api/client/coffee-sessions/clear", { method: "POST" });
        clearLocalCart();
        router.refresh();
        return;
      }

      if (ok) {
        clearLocalCart();
        setLocalCheckoutFeedback("Đặt hàng thành công!");
        router.replace(`/${encodeURIComponent(tableCode)}?tab=orders`);
        router.refresh();
        return;
      }

      setLocalCheckoutFeedback(
        (typeof payload?.message === "string" && payload.message) ||
          "Đặt hàng thất bại, vui lòng thử lại.",
      );
    } catch {
      setLocalCheckoutFeedback("Lỗi mạng, vui lòng thử lại.");
    } finally {
      setSubmittingLocalCheckout(false);
    }
  };

  return (
    <div className={cn("px-4 pt-3", className)}>
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Đơn của tôi
        </h1>
      </header>

      {!hasCart && !hasOrders ? (
        <div className="flex flex-col items-center rounded-2xl bg-muted/40 px-6 py-14 text-center">
          <div className="text-5xl">🧾</div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Chưa có đơn nào
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
            Đặt món ở tab Thực đơn - giỏ và đơn sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {checkoutIntent ? (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs">
                  ✅
                </span>
                Xác nhận đơn trước khi gửi
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                {hasLocalCart ? (
                  <ul className="divide-y divide-border">
                    {localCheckoutRows.map(
                      ({ line, item, unit, lineTotal, selectionText }) => (
                        <li
                          key={line.lineId}
                          className="flex items-start justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-foreground">
                              {item?.name ??
                                `Món #${line.itemId.slice(-Math.min(6, line.itemId.length))}`}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              SL: {line.quantity} · {formatPrice(unit)}/món
                            </p>
                            {line.note ? (
                              <p className="mt-0.5 text-xs text-foreground/80">
                                {line.note}
                              </p>
                            ) : null}
                            {selectionText ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {selectionText}
                              </p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                            {item ? formatPrice(lineTotal) : "—"}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Không có món nào để checkout.
                  </p>
                )}
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  {localCheckoutFeedback ? (
                    <p
                      className={cn(
                        "mb-2 rounded-lg px-3 py-2 text-sm",
                        localCheckoutFeedback.includes("thành công")
                          ? "bg-primary text-primary-foreground"
                          : "bg-destructive text-destructive-foreground",
                      )}
                    >
                      {localCheckoutFeedback}
                    </p>
                  ) : null}
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tổng tạm tính</span>
                    <span className="text-base font-bold text-primary tabular-nums">
                      {formatPrice(localCheckoutTotal)}
                    </span>
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={!hasLocalCart || submittingLocalCheckout}
                    onClick={handleConfirmLocalCheckout}
                  >
                    {submittingLocalCheckout
                      ? "Đang gửi..."
                      : "Xác nhận đặt hàng"}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {hasCart && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs">
                  🛒
                </span>
                Giỏ hàng
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                <ul className="divide-y divide-border">
                  {useLineItems
                    ? lineItems.map((line, idx) => {
                        const id = line.menuItemId ?? line.itemId ?? "";
                        const it = id ? itemById.get(id) : undefined;
                        const selectionText = formatSelectionLabels(
                          line.selections,
                          it,
                        );
                        const name =
                          pureLineItemName(line.name) ??
                          it?.name ??
                          (id
                            ? `Món #${id.slice(-Math.min(6, id.length))}`
                            : `Món ${idx + 1}`);
                        const showListStrike =
                          line.lineListTotal > line.lineChargedTotal + 0.0001;
                        const showUnitStrike =
                          Math.abs(line.listUnitPrice - line.chargedUnitPrice) >
                          0.0001;
                        return (
                          <li
                            key={`${id || "row"}-${idx}`}
                            className="flex items-start justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-foreground">
                                {name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                SL: {line.quantity}
                                {showUnitStrike ? (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <span className="line-through decoration-muted-foreground/80">
                                      {formatPrice(line.listUnitPrice)}
                                    </span>
                                  </>
                                ) : line.chargedUnitPrice > 0 ||
                                  line.listUnitPrice > 0 ? (
                                  <>
                                    {" "}
                                    · {formatPrice(line.chargedUnitPrice)}/món
                                  </>
                                ) : null}
                              </p>
                              {line.note ? (
                                <p className="mt-0.5 text-xs text-foreground/80">
                                  Ghi chú: {line.note}
                                </p>
                              ) : null}
                              {selectionText ? (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Tùy chọn: {selectionText}
                                </p>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right tabular-nums">
                              {showListStrike ? (
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatPrice(line.lineListTotal)}
                                </p>
                              ) : null}
                              <p
                                className={cn(
                                  "text-sm font-semibold text-primary",
                                  showListStrike && "mt-0.5",
                                )}
                              >
                                {formatPrice(line.lineChargedTotal)}
                              </p>
                            </div>
                          </li>
                        );
                      })
                    : pricedCartLines.map((line) => {
                        const it = itemById.get(line.itemId);
                        const name =
                          it?.name ??
                          `Món #${line.itemId.slice(-Math.min(6, line.itemId.length))}`;
                        const unit = basePriceForBoardGame(it);
                        const lineTotal = unit * line.chargedQty;
                        const freeQty =
                          line.categoryId === "drink"
                            ? Math.max(0, line.qty - line.chargedQty)
                            : 0;
                        return (
                          <li
                            key={`${line.categoryId}-${line.itemId}`}
                            className="flex items-start justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-foreground">
                                {name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                SL: {line.qty}
                                {line.categoryId === "drink" && freeQty > 0
                                  ? ` · miễn phí ${freeQty}`
                                  : null}
                                {line.categoryId === "drink" &&
                                line.chargedQty > 0
                                  ? ` · tính tiền ${line.chargedQty}`
                                  : null}
                                {it ? ` · ${formatPrice(unit)}/món` : null}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                              {it ? formatPrice(lineTotal) : "—"}
                            </p>
                          </li>
                        );
                      })}
                </ul>
                {useLineItems ? (
                  <div className="space-y-1 border-t border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        Tạm tính (thực trả)
                      </span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        {formatPrice(chargedTotalDisplay)}
                      </span>
                    </div>
                  </div>
                ) : (
                  cartTotalMenu > 0 && (
                    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Tạm tính
                      </span>
                      <span className="text-base font-bold text-primary">
                        {formatPrice(cartTotalMenu)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </section>
          )}

          {hasOrders && (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs">
                  📋
                </span>
                Lịch sử đơn hàng
              </h2>
              <ul className="space-y-2">
                {orders.map((o, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-sm shadow-sm"
                  >
                    <p className="font-medium text-foreground">
                      {orderLine(o, i)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
