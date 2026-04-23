import { getTableByCode } from "@/lib/api";
import {
  COFFEE_ACCESS_TOKEN_COOKIE,
  COFFEE_SESSION_TABLE_COOKIE,
} from "@/lib/coffee-session";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { SupportCallButton } from "@/components/table/SupportCallButton";
import Image from "next/image";
import jozoLogo from "@/assets/images/jozo-logo.png";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const table = await getTableByCode(tableId);
  const name = table?.name ?? `Bàn ${tableId}`;
  return {
    title: `${name} - Jozo Order`,
  };
}

export default async function TableLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
  const showSupport =
    Boolean(accessToken) && sessionTableId === tableMongoId;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden rounded-xl border border-border bg-white/90 px-2 py-1 shadow-sm sm:block">
              <Image src={jozoLogo} alt="Jozo" className="h-6 w-auto" priority />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {table.code}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">
                {table.name}
              </h1>
              <p className="text-[11px] text-muted-foreground">Bàn {table.code}</p>
            </div>
          </div>
          {showSupport ? <SupportCallButton tableCode={table.code} /> : null}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
