import type { CoffeeSessionSubmitCartRequest } from "@/types";

/**
 * Goi BFF POST /api/client/coffee-session-orders/me/submit-cart
 * (token HttpOnly — khong can Bearer o browser).
 */
export async function submitCoffeeSessionCart(
  cart: CoffeeSessionSubmitCartRequest["cart"],
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const body: CoffeeSessionSubmitCartRequest = { cart };

  const res = await fetch("/api/client/coffee-session-orders/me/submit-cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => null)) as unknown;
  return { ok: res.ok, status: res.status, data };
}
