import { getBoardGameGuideData, getFnbMenuData, getTableByCode } from "@/lib/api";
import { TableAppShell } from "@/components/table/TableAppShell";
import { ClearCoffeeSessionGate } from "@/components/table/ClearCoffeeSessionGate";
import { TablePinUnlock } from "@/components/table/TablePinUnlock";
import {
  COFFEE_ACCESS_TOKEN_COOKIE,
  COFFEE_SESSION_TABLE_COOKIE,
} from "@/lib/coffee-session";
import { loadCoffeeSessionMe } from "@/lib/coffee-session-me";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Category, MenuItem } from "@/types";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;

  const table = await getTableByCode(tableId);
  if (!table) {
    notFound();
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(COFFEE_ACCESS_TOKEN_COOKIE)?.value;
  const sessionTableId = cookieStore.get(COFFEE_SESSION_TABLE_COOKIE)?.value;
  const tableMongoId = String(table._id);
  const hasCoffeeSession =
    Boolean(accessToken) && sessionTableId === tableMongoId;

  if (!hasCoffeeSession) {
    return <TablePinUnlock tableCode={tableId} />;
  }

  const sessionMe = await loadCoffeeSessionMe();
  if (sessionMe.unauthorized) {
    return <ClearCoffeeSessionGate />;
  }
  const coffeeMe = sessionMe.data;

  const { categories: rawCategories, items: rawMenuItems } =
    await getFnbMenuData();
  const boardGames = await getBoardGameGuideData();

  const categories: Category[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    sortOrder: c.sortOrder,
  }));

  const items: MenuItem[] = rawMenuItems.map((item) => ({
    id: String(item._id),
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image ?? null,
    categoryId: String(item.categoryId),
    isAvailable: item.isAvailable,
    options: (item.options ?? []).map(
      (opt: {
        id: string;
        name: string;
        minSelect?: number;
        maxSelect?: number;
        choices: {
          id: string;
          label: string;
          priceAdjustment: number;
        }[];
      }) => ({
        id: opt.id,
        name: opt.name,
        minSelect: opt.minSelect,
        maxSelect: opt.maxSelect,
        choices: opt.choices.map((ch) => ({
          id: ch.id,
          label: ch.label,
          priceAdjustment: ch.priceAdjustment,
        })),
      }),
    ),
  }));

  return (
    <TableAppShell
      categories={categories}
      items={items}
      boardGames={boardGames}
      tableCode={tableId}
      coffeeMe={coffeeMe}
    />
  );
}
