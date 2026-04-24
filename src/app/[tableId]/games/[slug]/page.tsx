import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BoardGameGuideDetail } from "@/components/table/BoardGameGuideDetail";
import { ClearCoffeeSessionGate } from "@/components/table/ClearCoffeeSessionGate";
import { TablePinUnlock } from "@/components/table/TablePinUnlock";
import { getBoardGameGuideBySlug, getTableByCode } from "@/lib/api";
import {
  COFFEE_ACCESS_TOKEN_COOKIE,
  COFFEE_SESSION_TABLE_COOKIE,
} from "@/lib/coffee-session";
import { loadCoffeeSessionMe } from "@/lib/coffee-session-me";

export default async function BoardGameGuideDetailPage({
  params,
}: {
  params: Promise<{ tableId: string; slug: string }>;
}) {
  const { tableId, slug } = await params;

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

  const boardGame = await getBoardGameGuideBySlug(slug);
  if (!boardGame) {
    notFound();
  }

  return <BoardGameGuideDetail game={boardGame} tableCode={tableId} />;
}
