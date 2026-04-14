/** HttpOnly cookies set after successful POST /client/coffee-sessions */
export const COFFEE_ACCESS_TOKEN_COOKIE = "coffee_access_token";
export const COFFEE_SESSION_TABLE_COOKIE = "coffee_session_table_id";

export function coffeeSessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}
