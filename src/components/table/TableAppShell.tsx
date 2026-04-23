"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, MenuItem } from "@/types";
import { MenuView } from "@/components/menu/MenuView";
import { cn } from "@/lib/utils";
import {
  CoffeeSessionMePanel,
  getCoffeeMeTabBadgeCount,
} from "@/components/menu/CoffeeSessionMeSummary";
import { BoardGameGuideTab } from "./BoardGameGuideTab";

type TableTab = "menu" | "orders" | "guide";

const TAB_BAR_VAR =
  "[--app-tab-bar:calc(3.625rem+env(safe-area-inset-bottom,0px))]";

function IconMenu({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(active ? "text-primary" : "text-muted-foreground")}
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconReceipt({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(active ? "text-primary" : "text-muted-foreground")}
      aria-hidden
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8H8" />
      <path d="M16 12H8" />
      <path d="M10 16H8" />
    </svg>
  );
}

function IconDice({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(active ? "text-primary" : "text-muted-foreground")}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface TableAppShellProps {
  categories: Category[];
  items: MenuItem[];
  tableCode: string;
  coffeeMe: unknown | null;
}

export function TableAppShell({
  categories,
  items,
  tableCode,
  coffeeMe,
}: TableAppShellProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TableTab>(() => {
    const initialTabParam = searchParams.get("tab");
    if (initialTabParam === "orders" || initialTabParam === "guide") {
      return initialTabParam;
    }
    return "menu";
  });
  const checkoutIntent = searchParams.get("checkout") === "1";
  const ordersBadge = coffeeMe != null ? getCoffeeMeTabBadgeCount(coffeeMe) : 0;
  const showOrdersDot = ordersBadge > 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", TAB_BAR_VAR)}>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
          tab === "menu"
            ? "pb-[calc(var(--app-tab-bar)+5.5rem)]"
            : "pb-[calc(var(--app-tab-bar)+0.75rem)]",
        )}
      >
        {tab === "menu" && (
          <MenuView
            categories={categories}
            items={items}
            tableCode={tableCode}
            insetBottomNav
          />
        )}
        {tab === "orders" && (
          <CoffeeSessionMePanel
            data={coffeeMe ?? {}}
            menuItems={items}
            tableCode={tableCode}
            checkoutIntent={checkoutIntent}
            className="pb-2"
          />
        )}
        {tab === "guide" && <BoardGameGuideTab />}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/98 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(195,10,10,0.12)] backdrop-blur-md supports-backdrop-filter:bg-background/92"
        aria-label="Điều hướng chính"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1">
          <button
            type="button"
            onClick={() => setTab("menu")}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
              tab === "menu"
                ? "text-primary"
                : "text-muted-foreground active:bg-muted/50",
            )}
          >
            <IconMenu active={tab === "menu"} />
            <span
              className={cn(
                "max-w-full truncate px-1 text-[10px] font-semibold leading-tight",
                tab === "menu" ? "text-primary" : "text-muted-foreground",
              )}
            >
              Thực đơn
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("orders")}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
              tab === "orders"
                ? "text-primary"
                : "text-muted-foreground active:bg-muted/50",
            )}
          >
            <span className="relative inline-flex">
              <IconReceipt active={tab === "orders"} />
              {showOrdersDot ? (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white tabular-nums">
                  {ordersBadge > 99 ? "99+" : ordersBadge}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "max-w-full truncate px-1 text-[10px] font-semibold leading-tight",
                tab === "orders" ? "text-primary" : "text-muted-foreground",
              )}
            >
              Đơn của tôi
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("guide")}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors",
              tab === "guide"
                ? "text-primary"
                : "text-muted-foreground active:bg-muted/50",
            )}
          >
            <IconDice active={tab === "guide"} />
            <span
              className={cn(
                "max-w-full truncate px-1 text-[10px] font-semibold leading-tight",
                tab === "guide" ? "text-primary" : "text-muted-foreground",
              )}
            >
              Trò chơi bàn
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
