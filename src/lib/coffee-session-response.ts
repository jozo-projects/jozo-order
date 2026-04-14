import type { NextResponse } from "next/server";
import {
  COFFEE_ACCESS_TOKEN_COOKIE,
  COFFEE_SESSION_TABLE_COOKIE,
} from "@/lib/coffee-session";

export function clearCoffeeSessionCookies(res: NextResponse) {
  res.cookies.delete(COFFEE_ACCESS_TOKEN_COOKIE);
  res.cookies.delete(COFFEE_SESSION_TABLE_COOKIE);
}
