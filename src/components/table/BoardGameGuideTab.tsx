"use client";

import Link from "next/link";
import type { BoardGameGuideItem } from "@/types";
import Image from "next/image";
import { useState } from "react";

interface BoardGameGuideTabProps {
  games: BoardGameGuideItem[];
  tableCode: string;
}

function getGuidePreview(content: string): string {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

export function BoardGameGuideTab(props: BoardGameGuideTabProps) {
  const { games, tableCode } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [playerCountFilter, setPlayerCountFilter] = useState<string>("all");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const availablePlayerCounts = Array.from(
    new Set(
      games.flatMap((game) => {
        if (typeof game.minPlayers !== "number" || typeof game.maxPlayers !== "number") {
          return [];
        }

        const min = Math.min(game.minPlayers, game.maxPlayers);
        const max = Math.max(game.minPlayers, game.maxPlayers);

        if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1) {
          return [];
        }

        return Array.from({ length: max - min + 1 }, (_, index) => min + index);
      }),
    ),
  ).sort((a, b) => a - b);

  const selectedPlayerCount =
    playerCountFilter === "all" ? null : Number.parseInt(playerCountFilter, 10);

  const filteredGames = games.filter((game) => {
    const matchesQuery =
      normalizedQuery.length === 0 || game.name.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) {
      return false;
    }

    if (selectedPlayerCount === null) {
      return true;
    }

    if (typeof game.minPlayers !== "number" || typeof game.maxPlayers !== "number") {
      return false;
    }

    const min = Math.min(game.minPlayers, game.maxPlayers);
    const max = Math.max(game.minPlayers, game.maxPlayers);

    return selectedPlayerCount >= min && selectedPlayerCount <= max;
  });

  if (games.length === 0) {
    return (
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Hướng dẫn board game
        </h1>
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Chưa có game board-game đang hoạt động.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-2">
      <header className="mb-4">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Hướng dẫn board game
        </h1>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Tìm game
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nhập tên game..."
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              Số lượng người chơi
            </span>
            <select
              value={playerCountFilter}
              onChange={(event) => setPlayerCountFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none ring-offset-background transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Tất cả</option>
              {availablePlayerCounts.map((count) => (
                <option key={count} value={count}>
                  {count} người
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {filteredGames.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Không tìm thấy game phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredGames.map((game) => (
            <li
              key={game.id}
              className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
            >
              {game.image ? (
                <Image
                  width={100}
                  height={100}
                  src={game.image}
                  alt={game.name}
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                <h2 className="text-base font-bold text-foreground">
                  {game.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {game.minPlayers ?? "?"} - {game.maxPlayers ?? "?"} người ·{" "}
                  {game.playTimeMinutes ?? "?"} phút
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-foreground">
                  Giải thích nhanh
                </p>
                <p
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {getGuidePreview(game.guideContent)}
                </p>
                <div className="mt-3">
                  <Link
                    href={`/${tableCode}/games/${game.slug}`}
                    className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
