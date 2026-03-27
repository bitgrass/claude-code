"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/types";
import Image from "next/image";

const RANK_BADGES: Record<number, { emoji: string; bg: string; text: string }> = {
  1: { emoji: "🥇", bg: "bg-yellow-100", text: "text-yellow-700" },
  2: { emoji: "🥈", bg: "bg-gray-100", text: "text-gray-600" },
  3: { emoji: "🥉", bg: "bg-orange-100", text: "text-orange-600" },
};

function PlatformBadge({ platform }: { platform: "twitter" | "farcaster" }) {
  if (platform === "farcaster") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
        🟣 FC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
      𝕏
    </span>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl">🏗️</span>
      <p className="text-gray-900 font-semibold">Leaderboard coming soon</p>
      <p className="text-sm text-muted max-w-xs text-center">
        Connect your account to see your rank once the leaderboard API is live.
      </p>
    </div>
  );
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!entries.length) return <EmptyLeaderboard />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide w-14">
              Rank
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">
              Player
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide">
              Wins
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">
              Level
            </th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">
              Win Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const badge = RANK_BADGES[entry.rank];
            const isHovered = hovered === entry.rank;

            return (
              <tr
                key={`${entry.platform}-${entry.handle}`}
                onMouseEnter={() => setHovered(entry.rank)}
                onMouseLeave={() => setHovered(null)}
                className={`border-b border-border/50 transition-colors ${
                  isHovered ? "bg-surface-muted" : ""
                }`}
              >
                {/* Rank */}
                <td className="py-3 px-4">
                  {badge ? (
                    <span className={`text-base`}>{badge.emoji}</span>
                  ) : (
                    <span className="text-sm font-bold text-muted">#{entry.rank}</span>
                  )}
                </td>

                {/* Player */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {entry.profilePhoto ? (
                      <Image
                        src={entry.profilePhoto}
                        alt={entry.handle}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                        {entry.handle[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {entry.displayName || `@${entry.handle}`}
                        </span>
                        <PlatformBadge platform={entry.platform} />
                      </div>
                      <span className="text-xs text-muted">@{entry.handle}</span>
                    </div>
                  </div>
                </td>

                {/* Wins */}
                <td className="py-3 px-4 text-right">
                  <span className="font-bold text-gray-900">{(entry.winsAllTime ?? 0).toLocaleString()}</span>
                </td>

                {/* Level */}
                <td className="py-3 px-4 text-right hidden sm:table-cell">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Lv.{entry.level ?? 0}
                  </span>
                </td>

                {/* Win Rate */}
                <td className="py-3 px-4 text-right hidden md:table-cell">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success"
                        style={{ width: `${entry.winRate ?? 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-10 text-right">
                      {entry.winRate ?? 0}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
