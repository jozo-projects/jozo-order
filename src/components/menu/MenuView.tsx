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
  peopleCount?: number;
  freeDrinkQuota?: number;
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
  peopleCount = 0,
  freeDrinkQuota = 0,
}: MenuViewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showDrinkInfo, setShowDrinkInfo] = useState(false);
  const addFromMenu = useCoffeeCartStore((s) => s.addFromMenu);
  const lines = useCoffeeCartStore((s) => s.lines);

  const filteredItems = useMemo(
    () => filterMenuItems(items, activeCategoryId, searchQuery),
    [items, activeCategoryId, searchQuery],
  );
  const drinkQtyInCart = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + (line.category === "drink" ? line.quantity : 0),
        0,
      ),
    [lines],
  );
  const remainingFreeDrink = Math.max(0, freeDrinkQuota - drinkQtyInCart);
  const orderedDrinkQty = Math.max(0, peopleCount - freeDrinkQuota);
  const totalDrinkQty = orderedDrinkQty + drinkQtyInCart;

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
            Thực đơn đang được cập nhật
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Vui lòng thử lại sau hoặc hỏi nhân viên.
          </p>
        </div>
        <MenuCartBar
          items={items}
          tableCode={tableCode}
          insetBottomNav={insetBottomNav}
          freeDrinkQuota={freeDrinkQuota}
        />
      </>
    );
  }

  return (
    <>
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Nước đã gọi: {totalDrinkQty}/{peopleCount} ly
          </p>
          <button
            type="button"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] leading-none"
            onClick={() => setShowDrinkInfo(true)}
            aria-label="Giải thích cách tính số ly nước"
          >
            i
          </button>
        </div>
      </div>
      {showDrinkInfo ? (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setShowDrinkInfo(false)}
            aria-label="Đóng giải thích"
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-background p-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground">
              Cách tính số ly nước
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Mỗi người tương ứng 1 ly theo gói bàn đã đăng ký. Chỉ số{" "}
              <span className="font-medium text-foreground">
                {totalDrinkQty}/{peopleCount}
              </span>{" "}
              nghĩa là bàn mình đã gọi {totalDrinkQty} ly trên tổng {peopleCount}{" "}
              người.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Ly vượt quá số người sẽ được tính theo giá niêm yết khi thêm vào giỏ.
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => setShowDrinkInfo(false)}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      ) : null}
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
        <div className="py-1">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              remainingFreeDrink={remainingFreeDrink}
              onTap={openItemDetail}
              onAdd={openItemDetail}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-3xl">🔍</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Không tìm thấy món nào
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={resetSearch}
              className="mt-2 text-xs font-medium text-primary"
            >
              Xóa bộ lọc
            </button>
          ) : null}
        </div>
      )}

      <MenuItemDetail
        item={selectedItem}
        remainingFreeDrink={remainingFreeDrink}
        onClose={closeItemDetail}
        onAdd={handleAddFromDetail}
      />

      <MenuCartBar
        items={items}
        tableCode={tableCode}
        insetBottomNav={insetBottomNav}
        freeDrinkQuota={freeDrinkQuota}
      />
    </>
  );
}
