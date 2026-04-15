import { COFFEE_ACCESS_TOKEN_COOKIE } from "@/lib/coffee-session";
import { clearCoffeeSessionCookies } from "@/lib/coffee-session-response";
import {
  getServerApiBase,
  postCoffeeSessionOrdersSubmitCart,
} from "@/lib/coffee-upstream";
import type {
  CartSelection,
  CoffeeSessionSubmitCartRequest,
  CoffeeSubmitCartLine,
} from "@/types";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function normalizeQtyMapLegacy(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input)) {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n < 0) continue;
    out[k] = n;
  }
  return out;
}

function hasLegacyPositive(
  drinks: Record<string, number>,
  snacks: Record<string, number>,
): boolean {
  const anyPos = (m: Record<string, number>) =>
    Object.values(m).some((v) => v > 0);
  return anyPos(drinks) || anyPos(snacks);
}

function normalizeSelections(raw: unknown): CartSelection[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CartSelection[] = [];
  for (const x of raw) {
    if (x == null || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, unknown>;
    const g = typeof o.groupKey === "string" ? o.groupKey.trim() : "";
    const k = typeof o.optionKey === "string" ? o.optionKey.trim() : "";
    if (g.length > 0 && k.length > 0) out.push({ groupKey: g, optionKey: k });
  }
  return out.length > 0 ? out : undefined;
}

function normalizeSubmitLine(raw: unknown): CoffeeSubmitCartLine | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const itemId = typeof o.itemId === "string" ? o.itemId.trim() : "";
  if (!itemId) return null;
  const cat = o.category;
  if (cat !== "drink" && cat !== "snack") return null;
  const qRaw = o.quantity;
  const qty = typeof qRaw === "number" ? qRaw : Number(qRaw);
  if (!Number.isInteger(qty) || qty < 1) return null;

  const line: CoffeeSubmitCartLine = {
    itemId,
    category: cat,
    quantity: qty,
  };
  if (typeof o.lineId === "string" && o.lineId.trim().length > 0) {
    line.lineId = o.lineId.trim();
  }
  if (typeof o.note === "string") {
    const t = o.note.trim().slice(0, 2000);
    if (t.length > 0) line.note = t;
  }
  const sel = normalizeSelections(o.selections);
  if (sel) line.selections = sel;
  return line;
}

/**
 * BFF: trinh duyet gui JSON { cart }, Next doc token tu cookie HttpOnly
 * va goi POST /client/coffee-session-orders/me/submit-cart voi Bearer.
 */
export async function POST(request: NextRequest) {
  try {
    const baseUrl = getServerApiBase();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, message: "Chua cau hinh SERVER_API_URL" },
        { status: 503 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(COFFEE_ACCESS_TOKEN_COOKIE)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Chua co phien ban (nhap PIN)" },
        { status: 401 },
      );
    }

    const raw = (await request.json().catch(() => null)) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json(
        { success: false, message: "Body khong hop le" },
        { status: 400 },
      );
    }
    const cartRaw = (raw as { cart?: unknown }).cart;
    if (!cartRaw || typeof cartRaw !== "object" || Array.isArray(cartRaw)) {
      return NextResponse.json(
        { success: false, message: "Thieu cart" },
        { status: 400 },
      );
    }

    const c = cartRaw as Record<string, unknown>;

    let lines: CoffeeSubmitCartLine[] | undefined;
    if ("lines" in c) {
      const lr = c.lines;
      if (lr !== undefined && !Array.isArray(lr)) {
        return NextResponse.json(
          { success: false, message: "cart.lines phai la mang" },
          { status: 400 },
        );
      }
      if (Array.isArray(lr)) {
        lines = lr
          .map(normalizeSubmitLine)
          .filter((x): x is CoffeeSubmitCartLine => x != null);
        if (lines.length !== lr.length) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Mot hoac nhieu dong lines khong hop le (itemId, category drink|snack, quantity nguyen >= 1)",
            },
            { status: 400 },
          );
        }
      }
    }

    const drinksProvided = "drinks" in c;
    const snacksProvided = "snacks" in c;
    if (drinksProvided !== snacksProvided) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Neu gui drinks hoac snacks (legacy) thi phai gui ca hai object",
        },
        { status: 400 },
      );
    }

    const drinks = drinksProvided ? normalizeQtyMapLegacy(c.drinks) : undefined;
    const snacks = snacksProvided ? normalizeQtyMapLegacy(c.snacks) : undefined;

    if (drinksProvided && snacksProvided) {
      if (
        c.drinks != null &&
        (typeof c.drinks !== "object" || Array.isArray(c.drinks))
      ) {
        return NextResponse.json(
          { success: false, message: "cart.drinks phai la object" },
          { status: 400 },
        );
      }
      if (
        c.snacks != null &&
        (typeof c.snacks !== "object" || Array.isArray(c.snacks))
      ) {
        return NextResponse.json(
          { success: false, message: "cart.snacks phai la object" },
          { status: 400 },
        );
      }
    }

    const hasLines = (lines?.length ?? 0) > 0;
    const d = drinks ?? {};
    const s = snacks ?? {};
    const legacyOk = hasLegacyPositive(d, s);

    if (!hasLines && !legacyOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gio trong: can lines.length > 0 hoac legacy drinks/snacks co quantity nguyen > 0",
        },
        { status: 400 },
      );
    }

    const body: CoffeeSessionSubmitCartRequest = {
      cart: {
        drinks: drinksProvided ? d : {},
        snacks: snacksProvided ? s : {},
      },
    };

    if (hasLines) {
      body.cart.lines = lines;
      if (!drinksProvided) body.cart.drinks = {};
      if (!snacksProvided) body.cart.snacks = {};
    }

    const {
      res: upstreamRes,
      data,
      rawText: upstreamRawText,
      isJson: upstreamIsJson,
    } = await postCoffeeSessionOrdersSubmitCart(
      baseUrl,
      token,
      body,
    );

    if (upstreamRes.status === 401) {
      const res = NextResponse.json(
        {
          success: false,
          message:
            "Phien het han hoac nhan vien da mo session moi. Nhap lai PIN.",
          sessionInvalid: true,
        },
        { status: 401 },
      );
      clearCoffeeSessionCookies(res);
      return res;
    }

    if (data != null) {
      return NextResponse.json(data, {
        status: upstreamRes.status,
      });
    }

    const fallback: Record<string, unknown> = {
      success: false,
      message: "Upstream tra body khong phai JSON",
      upstreamStatus: upstreamRes.status,
      upstreamStatusText: upstreamRes.statusText || null,
      upstreamContentType: upstreamRes.headers.get("content-type"),
      upstreamBodyWasJson: upstreamIsJson,
    };
    const preview = upstreamRawText.trim();
    if (preview.length > 0) {
      fallback.upstreamRaw = preview.slice(0, 800);
    }
    return NextResponse.json(fallback, {
      status: upstreamRes.status,
    });
  } catch (error) {
    console.error("submit-cart proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Loi he thong" },
      { status: 500 },
    );
  }
}
