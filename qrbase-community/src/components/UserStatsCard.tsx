"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGameStatus } from "@/lib/qrbase-api";
import type { GameStatus } from "@/types";
import Image from "next/image";

function StatBox({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: string | number;
  emoji: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-4 ${color} flex flex-col gap-1`}>
      <span className="text-lg">{emoji}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-muted font-medium">{label}</span>
    </div>
  );
}

export function UserStatsCard() {
  const { identity } = useAuth();
  const [stats, setStats] = useState<GameStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!identity) return;
    setLoading(true);
    getGameStatus(identity.handle, identity.platform)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [identity]);

  if (!identity) return null;

  return (
    <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {identity.profilePhoto ? (
          <Image
            src={identity.profilePhoto}
            alt={identity.handle}
            width={52}
            height={52}
            className="rounded-full ring-2 ring-primary/20"
          />
        ) : (
          <div className="w-13 h-13 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
            {identity.handle[0].toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900">@{identity.handle}</p>
            {stats && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-white">
                Lv.{stats.level}
              </span>
            )}
          </div>
          <p className="text-sm text-muted">{identity.platform === "twitter" ? "𝕏 Twitter" : "🟣 Farcaster"}</p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="All-Time Wins" value={stats.winsAllTime} emoji="🏆" color="bg-yellow-50" />
            <StatBox label="Today's Wins" value={stats.winsToday} emoji="⚡" color="bg-blue-50" />
            <StatBox label="Win Rate" value={`${Math.round(stats.winRate * 100)}%`} emoji="🎯" color="bg-green-50" />
            <StatBox label="Total Plays" value={stats.totalPlays} emoji="🎮" color="bg-purple-50" />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Level {stats.level} progress</span>
              <span>{Math.round(stats.progressToNextLevel * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.round(stats.progressToNextLevel * 100)}%` }}
              />
            </div>
          </div>

          {/* Token wins */}
          {Object.keys(stats.tokenWins).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-2">Token Wins</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.tokenWins).map(([token, wins]) => (
                  <span
                    key={token}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary"
                  >
                    ${token}: {wins}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !stats && (
        <p className="text-sm text-muted text-center py-4">
          No stats found for @{identity.handle}. Play some QRbase games first! 🎮
        </p>
      )}
    </div>
  );
}
