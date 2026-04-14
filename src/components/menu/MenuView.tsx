"use client";

import { useCallback, useMemo, useState } from "react";
import type { Category, MenuItem } from "@/types";
import { useCoffeeCartStore } from "@/stores/useCoffeeCartStore";
import { MenuCartBar } from "./MenuCartBar";
import { MenuCategoryTabs } from "./MenuCategoryTabs";
import { MenuItemCard } from "./MenuItemCard";
import { MenuItemDetail, type MenuItemDetailAddExtra } from "./MenuItemDetail";
import { MenuSearch } from "./MenuSearch";

interface MenuViewProps {
  categories: Category[];
  items: MenuItem[];
  tableCode: string;
  insetBottomNav?: boolean;
}

function filterMenuItems(
  items: MenuItem[],
  activeCategoryId: string | null,
  searchQuery: string,
): MenuItem[] {
  let result = items;

  if (activeCategoryId) {
    result = result.filter((item) => item.categoryId === activeCategoryId);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}

export function MenuView({
  categories,
  items,
  tableCode,
  insetBottomNav = false,
}: MenuViewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const addFromMenu = useCoffeeCartStore((s) => s.addFromMenu);

  const filteredItems = useMemo(
    () => filterMenuItems(items, activeCategoryId, searchQuery),
    [items, activeCategoryId, searchQuery],
  );

  const openItemDetail = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const closeItemDetail = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleAddFromDetail = useCallback(
    (item: MenuItem, extra?: MenuItemDetailAddExtra) => {
      addFromMenu(item, extra);
    },
    [addFromMenu],
  );

  const resetSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (items.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="text-4xl">📋</div>
          <p className="mt-4 text-sm font-medium text-foreground">
            Menu dang duoc cap nhat
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Vui long thu lai sau hoac hoi nhan vien.
          </p>
        </div>
        <MenuCartBar
          items={items}
          tableCode={tableCode}
          insetBottomNav={insetBottomNav}
        />
      </>
    );
  }

  return (
    <>
      <div className="px-4 pt-3 pb-1">
        <MenuSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {categories.length > 0 && !searchQuery ? (
        <div className="sticky top-14 z-30 border-b border-border bg-background">
          <MenuCategoryTabs
            categories={categories}
            activeId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="divide-y divide-border">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onTap={openItemDetail}
              onAdd={openItemDetail}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-3xl">🔍</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Khong tim thay mon nao
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={resetSearch}
              className="mt-2 text-xs font-medium text-primary"
            >
              Xoa bo loc
            </button>
          ) : null}
        </div>
      )}

      <MenuItemDetail
        item={selectedItem}
        onClose={closeItemDetail}
        onAdd={handleAddFromDetail}
      />

      <MenuCartBar
        items={items}
        tableCode={tableCode}
        insetBottomNav={insetBottomNav}
      />
    </>
  );
}
