import { cookies } from "next/headers";
import { COFFEE_ACCESS_TOKEN_COOKIE } from "@/lib/coffee-session";
import { getCoffeeSessionsMe, getServerApiBase } from "@/lib/coffee-upstream";
import type { CoffeeSessionsMeResponse } from "@/types";

export type CoffeeSessionMeResult = {
  data: CoffeeSessionsMeResponse | null;
  /** Token het han / staff mo session moi — FE can xoa cookie va ve man PIN */
  unauthorized: boolean;
};

/** GET /client/coffee-sessions/me từ cookie token (Server Component). */
export async function loadCoffeeSessionMe(): Promise<CoffeeSessionMeResult> {
  const baseUrl = getServerApiBase();
  if (!baseUrl) return { data: null, unauthorized: false };

  const cookieStore = await cookies();
  const token = cookieStore.get(COFFEE_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { data: null, unauthorized: false };

  const { res, data } = await getCoffeeSessionsMe(baseUrl, token);
  if (res.status === 401) {
    return { data: null, unauthorized: true };
  }
  if (!res.ok) return { data: null, unauthorized: false };
  return { data, unauthorized: false };
}
