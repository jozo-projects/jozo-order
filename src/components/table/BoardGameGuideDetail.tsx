"use client";

import Link from "next/link";
import type { BoardGameGuideItem } from "@/types";

interface BoardGameGuideDetailProps {
  game: BoardGameGuideItem;
  tableCode: string;
}

function splitGuideLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function BoardGameGuideDetail(props: BoardGameGuideDetailProps) {
  const { game, tableCode } = props;
  const guideLines = splitGuideLines(game.guideContent);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 pb-8">
      <Link
        href={`/${tableCode}?tab=guide`}
        className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"
      >
        Quay lại danh sách
      </Link>

      <article className="mt-3 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
        {game.image ? (
          <img
            src={game.image}
            alt={game.name}
            className="h-56 w-full object-cover"
            loading="lazy"
          />
        ) : null}

        <div className="border-b border-border bg-muted/30 px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">{game.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {game.minPlayers ?? "?"} - {game.maxPlayers ?? "?"} người ·{" "}
            {game.playTimeMinutes ?? "?"} phút
          </p>
          {game.shortDescription ? (
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {game.shortDescription}
            </p>
          ) : null}
        </div>

        <div className="px-4 py-4">
          <h2 className="text-sm font-semibold text-foreground">Hướng dẫn chi tiết</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
            {guideLines.length > 0 ? (
              guideLines.map((line, index) => <p key={`${game.id}-${index}`}>{line}</p>)
            ) : (
              <p>Đang cập nhật nội dung hướng dẫn.</p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
