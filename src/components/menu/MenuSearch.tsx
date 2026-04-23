"use client";

import { cn } from "@/lib/utils";
import { useRef } from "react";

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function MenuSearch({ value, onChange, className }: MenuSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", className)}>
      <svg
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tìm món..."
        className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm outline-none placeholder:text-muted-foreground shadow-[0_4px_14px_rgba(195,10,10,0.06)] focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {value && (
        <button
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground active:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
