"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PIN_LEN = 6;

interface TablePinUnlockProps {
  tableCode: string;
}

export function TablePinUnlock({ tableCode }: TablePinUnlockProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(() => Array(PIN_LEN).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Tang khi can goi lai API (loi mang / PIN sai) ma PIN khong doi */
  const [retryKey, setRetryKey] = useState(0);
  const [focusIndex, setFocusIndex] = useState<number | null>(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const pin = digits.join("");
  const valid = pin.length === PIN_LEN && /^\d{6}$/.test(pin);

  const focusAt = useCallback((i: number) => {
    const el = inputsRef.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  useEffect(() => {
    focusAt(0);
  }, [focusAt]);

  const setDigitAt = (index: number, value: string) => {
    const d = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = d;
      return next;
    });
    if (d && index < PIN_LEN - 1) {
      requestAnimationFrame(() => focusAt(index + 1));
    }
  };

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (v.length > 1) {
      const pasted = v.replace(/\D/g, "").slice(0, PIN_LEN);
      if (pasted.length > 0) {
        setDigits(() => {
          const next = Array(PIN_LEN).fill("");
          for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
          return next;
        });
        const nextFocus = Math.min(pasted.length, PIN_LEN - 1);
        requestAnimationFrame(() => focusAt(nextFocus));
      }
      return;
    }
    setDigitAt(index, v);
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigits((prev) => {
          const next = [...prev];
          next[index] = "";
          return next;
        });
      } else if (index > 0) {
        setDigits((prev) => {
          const next = [...prev];
          next[index - 1] = "";
          return next;
        });
        focusAt(index - 1);
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      focusAt(index - 1);
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && index < PIN_LEN - 1) {
      focusAt(index + 1);
      e.preventDefault();
    }
  }

  function handlePaste(startIndex: number, e: React.ClipboardEvent) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "");
    const room = PIN_LEN - startIndex;
    const text = raw.slice(0, room);
    if (!text) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < text.length; i++) next[startIndex + i] = text[i];
      return next;
    });
    const nextFocus = Math.min(startIndex + text.length, PIN_LEN - 1);
    requestAnimationFrame(() => focusAt(nextFocus));
  }

  useEffect(() => {
    if (!valid) return;

    let cancelled = false;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        /* Cung origin (Next :3003): Route Handler proxy sang SERVER_API_URL + set cookie httpOnly */
        const res = await fetch("/api/client/coffee-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tableCode, pin }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          sessionInvalid?: boolean;
        };

        if (cancelled) return;

        if (res.status === 401 && data.sessionInvalid) {
          router.refresh();
          return;
        }

        if (!res.ok || !data.success) {
          setError(data.message ?? "Khong the xac thuc PIN");
          return;
        }

        router.refresh();
      } catch {
        if (!cancelled) setError("Loi mang, thu lai");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [valid, pin, tableCode, router, retryKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError("Nhap du 6 chu so");
      return;
    }
    if (loading) return;
    if (error != null) setRetryKey((k) => k + 1);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="text-center">
          <div className="text-3xl" aria-hidden>
            🔐
          </div>
          <h2 className="mt-3 text-lg font-semibold">Nhap ma PIN ban</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ma 6 chu so tren ban de dat mon
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <fieldset>
            <legend className="sr-only">Ma PIN 6 chu so</legend>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputsRef.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  id={`pin-${index}`}
                  aria-label={`Chu so thu ${index + 1}`}
                  maxLength={PIN_LEN}
                  value={digit}
                  onChange={(e) => handleChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={(e) => handlePaste(index, e)}
                  onFocus={() => setFocusIndex(index)}
                  onBlur={() => setFocusIndex(null)}
                  className={cn(
                    "h-12 w-10 rounded-xl border-2 bg-muted/30 text-center font-mono text-xl font-semibold tabular-nums text-foreground outline-none transition-all sm:h-14 sm:w-11 sm:text-2xl",
                    "border-border placeholder:text-muted-foreground/40",
                    focusIndex === index &&
                      "border-primary ring-4 ring-primary/15",
                    digit && "border-primary/40 bg-muted/50",
                  )}
                  placeholder=""
                />
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="text-center text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!valid || loading}
          >
            {loading ? "Dang xac thuc..." : "Xac nhan"}
          </Button>
        </form>
      </div>
    </div>
  );
}
