import { NextRequest, NextResponse } from "next/server";

const GO_HOST_PREFIX = "go.";
const ORDER_HOST_PREFIX = "order.";

export default function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  if (hostname.startsWith(GO_HOST_PREFIX)) {
    const url = new URL(request.url);
    url.hostname = hostname.replace(GO_HOST_PREFIX, ORDER_HOST_PREFIX);
    return NextResponse.redirect(url, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
