import { clearCoffeeSessionCookies } from "@/lib/coffee-session-response";
import { NextResponse } from "next/server";

/** Xoa cookie phien ban (goi tu browser khi 401 / staff mo session moi). */
export async function POST() {
  const res = NextResponse.json({ success: true });
  clearCoffeeSessionCookies(res);
  return res;
}
