/** Gọi backend — dùng trong Route Handler và Server Components (chi SERVER_API_URL, khong can NEXT_PUBLIC). */

import type {
  CoffeeSessionSubmitCartRequest,
  CoffeeSessionsMeResponse,
} from "@/types";

export function getServerApiBase(): string | null {
  const raw =
    process.env.SERVER_API_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SERVER_API_URL?.replace(/\/$/, "");
  return raw || null;
}

export async function postCoffeeSessionsActivate(
  baseUrl: string,
  tableId: string,
  pin: string,
) {
  const res = await fetch(`${baseUrl}/client/coffee-sessions/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId, pin }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

export async function getCoffeeSessionsMe(
  baseUrl: string,
  accessToken: string,
) {
  const res = await fetch(`${baseUrl}/client/coffee-sessions/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as
    | CoffeeSessionsMeResponse
    | null;
  return { res, data };
}

export async function postCoffeeSessionOrdersSubmitCart(
  baseUrl: string,
  accessToken: string,
  body: CoffeeSessionSubmitCartRequest,
) {
  const res = await fetch(
    `${baseUrl}/client/coffee-session-orders/me/submit-cart`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  const data = (await res.json().catch(() => null)) as unknown;
  return { res, data };
}

function pickTokenFromObject(obj: Record<string, unknown>): string | null {
  for (const key of ["access_token", "accessToken", "token"] as const) {
    const v = obj[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/** Ho tro nhieu kieu body backend: phang, { data }, { result }, v.v. */
export function extractAccessToken(
  payload: Record<string, unknown>,
): string | null {
  const top = pickTokenFromObject(payload);
  if (top) return top;

  const layer1 = payload.data ?? payload.result ?? payload.payload;
  if (layer1 && typeof layer1 === "object" && !Array.isArray(layer1)) {
    const o1 = layer1 as Record<string, unknown>;
    const mid = pickTokenFromObject(o1);
    if (mid) return mid;

    const layer2 = o1.data ?? o1.session;
    if (layer2 && typeof layer2 === "object" && !Array.isArray(layer2)) {
      const deep = pickTokenFromObject(layer2 as Record<string, unknown>);
      if (deep) return deep;
    }
  }

  return null;
}
