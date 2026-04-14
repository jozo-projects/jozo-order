"use client";

import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";
import type { Category } from "@/types";

interface MenuCategoryTabsProps {
  categories: Category[];
  activeId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function MenuCategoryTabs({
  categories,
  activeId,
  onSelect,
}: MenuCategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const scrollLeft = button.offsetLeft - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2.5"
    >
      <button
        ref={activeId === null ? activeRef : undefined}
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
          activeId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground active:bg-muted/80"
        )}
      >
        Tat ca
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          ref={activeId === cat.id ? activeRef : undefined}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
            activeId === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground active:bg-muted/80"
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
