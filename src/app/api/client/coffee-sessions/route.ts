import { connectDB } from "@/lib/mongodb";
import { CoffeeTable } from "@/lib/models/table";
import {
  COFFEE_ACCESS_TOKEN_COOKIE,
  COFFEE_SESSION_TABLE_COOKIE,
  coffeeSessionCookieOptions,
} from "@/lib/coffee-session";
import { clearCoffeeSessionCookies } from "@/lib/coffee-session-response";
import {
  extractAccessToken,
  getCoffeeSessionsMe,
  getServerApiBase,
  postCoffeeSessionsActivate,
} from "@/lib/coffee-upstream";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * BFF: trinh duyet chi goi Next (cung origin). Day la noi fetch toi
 * SERVER_API_URL (/client/coffee-sessions/activate + /me) va set cookie.
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

    const body = await request.json();
    const { tableCode, pin } = body as { tableCode?: string; pin?: string };

    if (!tableCode || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, message: "Thieu ma ban hoac PIN" },
        { status: 400 },
      );
    }

    const pinDigits = pin.replace(/\D/g, "");
    if (pinDigits.length !== 6) {
      return NextResponse.json(
        { success: false, message: "PIN gom dung 6 chu so" },
        { status: 400 },
      );
    }

    await connectDB();
    const table = await CoffeeTable.findOne({
      code: tableCode,
      isActive: true,
    })
      .select("_id")
      .lean();

    if (!table) {
      return NextResponse.json(
        { success: false, message: "Ban khong ton tai" },
        { status: 404 },
      );
    }

    const tableId = String(table._id);

    const { res: activateRes, data: payload } =
      await postCoffeeSessionsActivate(baseUrl, tableId, pinDigits);

    if (!activateRes.ok) {
      const message =
        (typeof payload.message === "string" && payload.message) ||
        (typeof payload.error === "string" && payload.error) ||
        "Dang nhap that bai";
      const status =
        activateRes.status >= 400 && activateRes.status < 600
          ? activateRes.status
          : 502;
      return NextResponse.json({ success: false, message }, { status });
    }

    const accessToken = extractAccessToken(payload);

    if (!accessToken) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[coffee-sessions] activate OK nhung khong doc duoc token. Keys:",
          Object.keys(payload),
        );
      }
      return NextResponse.json(
        {
          success: false,
          message:
            "Backend khong tra access_token dung dinh dang (can access_token / accessToken / token, co the trong data).",
        },
        { status: 502 },
      );
    }

    const { res: meRes, data: meData } = await getCoffeeSessionsMe(
      baseUrl,
      accessToken,
    );

    if (meRes.status === 401) {
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

    const maxAge = DEFAULT_MAX_AGE_SEC;
    const res = NextResponse.json({
      success: true,
      session: payload.session ?? null,
      me: meRes.ok ? meData : null,
      meError: meRes.ok ? null : meRes.status,
    });

    res.cookies.set(
      COFFEE_ACCESS_TOKEN_COOKIE,
      accessToken,
      coffeeSessionCookieOptions(maxAge),
    );
    res.cookies.set(
      COFFEE_SESSION_TABLE_COOKIE,
      tableId,
      coffeeSessionCookieOptions(maxAge),
    );

    return res;
  } catch (error) {
    console.error("coffee-sessions proxy error:", error);
    return NextResponse.json(
      { success: false, message: "Loi he thong" },
      { status: 500 },
    );
  }
}
