"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Backend trả 401 cho /me: xoá cookie httpOnly qua API, refresh để về TablePinUnlock.
 */
export function ClearCoffeeSessionGate() {
  const router = useRouter();
  const [message, setMessage] = useState("Đang cập nhật phiên bàn...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/client/coffee-sessions/clear", {
          method: "POST",
        });
        if (!res.ok) {
          if (!cancelled) setMessage("Không thể xoá phiên, vui lòng tải lại trang.");
          return;
        }
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) setMessage("Lỗi mạng, vui lòng tải lại trang.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
