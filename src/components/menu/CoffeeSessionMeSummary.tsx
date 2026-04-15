"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CoffeeSessionOrderLineItem, MenuItem } from "@/types";
import { submitCoffeeSessionCart } from "@/lib/coffee-submit-cart-client";
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
  const id = pickLineItemId(o);

  return {
    menuItemId: id,
    itemId: id,
    name,
    quantity: qty,
    listUnitPrice: listUnit,
    lineListTotal: lineList,
    chargedUnitPrice: chargedUnit,
    lineChargedTotal: lineCharged,
  };
}

/** Lay `result.order.lineItems` tu GET /client/coffee-sessions/me. */
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
    const items = (wrap as Record<string, unknown>).lineItems;
    if (!Array.isArray(items)) continue;
    const parsed = items
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

function formatLineSelections(
  line: {
    selections?: Array<{ groupKey: string; optionKey: string }>;
  },
  item: MenuItem | undefined,
): string {
  if (!line.selections?.length) return "";
  const optionGroups = item?.options ?? [];
  return line.selections
    .map((s) => {
      const group = optionGroups.find((g) => g.id === s.groupKey);
      const choice = group?.choices.find((c) => c.id === s.optionKey);
      if (!group?.name || !choice?.label) return "";
      return `${group.name}: ${choice.label}`;
    })
    .filter((x) => x.length > 0)
    .join(" · ");
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

  const hasCart = useLineItems || cartLines.length > 0;
  const hasOrders = orders.length > 0;
  const hasLocalCart = localCartLines.length > 0;

  const localCheckoutRows = useMemo(
    () =>
      localCartLines.map((line) => {
        const item = itemById.get(line.itemId);
        const unit =
          basePriceForBoardGame(item) + optionsExtraForLine(item, line);
        const selectionText = formatLineSelections(line, item);
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
        setLocalCheckoutFeedback("Dat hang thanh cong!");
        router.replace(`/${encodeURIComponent(tableCode)}?tab=orders`);
        router.refresh();
        return;
      }

      setLocalCheckoutFeedback(
        (typeof payload?.message === "string" && payload.message) ||
          "Dat hang that bai, thu lai.",
      );
    } catch {
      setLocalCheckoutFeedback("Loi mang, thu lai.");
    } finally {
      setSubmittingLocalCheckout(false);
    }
  };

  return (
    <div className={cn("px-4 pt-3", className)}>
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Don cua toi
        </h1>
      </header>

      {!hasCart && !hasOrders ? (
        <div className="flex flex-col items-center rounded-2xl bg-muted/40 px-6 py-14 text-center">
          <div className="text-5xl">🧾</div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Chua co don nao
          </p>
          <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
            Dat mon o tab Menu — gio va don se hien o day.
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
                Xac nhan don truoc khi gui
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
                                `Mon #${line.itemId.slice(-Math.min(6, line.itemId.length))}`}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              SL: {line.quantity} · {formatPrice(unit)}/mon
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
                    Khong co mon nao de checkout.
                  </p>
                )}
                <div className="border-t border-border bg-muted/30 px-4 py-3">
                  {localCheckoutFeedback ? (
                    <p
                      className={cn(
                        "mb-2 rounded-lg px-3 py-2 text-sm",
                        localCheckoutFeedback.includes("thanh cong")
                          ? "bg-primary text-primary-foreground"
                          : "bg-destructive text-destructive-foreground",
                      )}
                    >
                      {localCheckoutFeedback}
                    </p>
                  ) : null}
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tong tam tinh</span>
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
                      ? "Dang gui..."
                      : "Xac nhan dat hang"}
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
                Gio hang
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
                <ul className="divide-y divide-border">
                  {useLineItems
                    ? lineItems.map((line, idx) => {
                        const id = line.menuItemId ?? line.itemId ?? "";
                        const it = id ? itemById.get(id) : undefined;
                        const name =
                          line.name ??
                          it?.name ??
                          (id
                            ? `Mon #${id.slice(-Math.min(6, id.length))}`
                            : `Mon ${idx + 1}`);
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
                                    · {formatPrice(line.chargedUnitPrice)}/mon
                                  </>
                                ) : null}
                              </p>
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
                          `Mon #${line.itemId.slice(-Math.min(6, line.itemId.length))}`;
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
                                  ? ` · mien phi ${freeQty}`
                                  : null}
                                {line.categoryId === "drink" &&
                                line.chargedQty > 0
                                  ? ` · tinh tien ${line.chargedQty}`
                                  : null}
                                {it ? ` · ${formatPrice(unit)}/mon` : null}
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
                    {listTotalSum > chargedTotalSum + 0.0001 ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Gia niem yet
                        </span>
                        <span className="text-muted-foreground line-through tabular-nums">
                          {formatPrice(listTotalSum)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        Tam tinh (thuc tra)
                      </span>
                      <span className="text-base font-bold text-primary tabular-nums">
                        {formatPrice(chargedTotalSum)}
                      </span>
                    </div>
                  </div>
                ) : (
                  cartTotalMenu > 0 && (
                    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        Tam tinh
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
                Lich su don hang
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
