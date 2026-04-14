"use client";

import { formatPrice, cn } from "@/lib/utils";
import { basePriceForBoardGame } from "@/lib/menu-item-pricing";
import type { MenuItem } from "@/types";

interface MenuItemCardProps {
  item: MenuItem;
  onTap: (item: MenuItem) => void;
  onAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onTap, onAdd }: MenuItemCardProps) {
  const displayPrice = basePriceForBoardGame(item);

  return (
    <div
      onClick={() => onTap(item)}
      className={cn(
        "flex gap-3 px-4 py-3 transition-colors active:bg-muted/50",
        !item.isAvailable && "opacity-50"
      )}
    >
      {item.image ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
          🍽️
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center min-w-0">
        <h3 className="text-sm font-medium leading-tight truncate">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">
            {formatPrice(displayPrice)}
          </span>
          {!item.isAvailable && (
            <span className="text-[10px] font-medium text-destructive">
              Het mon
            </span>
          )}
        </div>
      </div>

      {item.isAvailable && (
        <div className="flex items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-sm transition-transform active:scale-90"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
