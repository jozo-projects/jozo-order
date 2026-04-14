"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Backend tra 401 cho /me: xoa cookie httpOnly qua API, refresh de ve TablePinUnlock.
 */
export function ClearCoffeeSessionGate() {
  const router = useRouter();
  const [message, setMessage] = useState("Dang cap nhat phien ban...");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/client/coffee-sessions/clear", {
          method: "POST",
        });
        if (!res.ok) {
          if (!cancelled) setMessage("Khong the xoa phien, thu tai trang.");
          return;
        }
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) setMessage("Loi mang, thu tai trang.");
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
