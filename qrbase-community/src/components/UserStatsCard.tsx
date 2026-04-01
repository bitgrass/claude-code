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
    <div className={`rounded-2xl p-4 ${color} flex flex-col gap-1 hover:-translate-y-0.5 transition-transform`}>
      <span className="text-xl">{emoji}</span>
      <span className="text-2xl font-black text-gray-900">{value}</span>
      <span className="text-xs text-muted font-bold uppercase tracking-wide">{label}</span>
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
    <div className="rounded-3xl border-2 border-border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        {identity.profilePhoto ? (
          <Image
            src={identity.profilePhoto}
            alt={identity.handle}
            width={52}
            height={52}
            className="rounded-2xl ring-2 ring-primary/30"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white text-xl font-black">
            {identity.handle[0].toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-black text-gray-900">@{identity.handle}</p>
            {stats && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-primary text-white">
                Lv.{stats.level} 🤖
              </span>
            )}
          </div>
          <p className="text-xs text-muted font-semibold">
            {identity.platform === "twitter" ? "𝕏 Twitter fren" : "🟣 Farcaster fren"}
          </p>
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
            <div className="flex justify-between text-xs font-bold text-muted mb-1.5">
              <span>Level {stats.level} → {stats.level + 1}</span>
              <span>{Math.round(stats.progressToNextLevel * 100)}%</span>
            </div>
            <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.round(stats.progressToNextLevel * 100)}%` }}
              />
            </div>
          </div>

          {/* Token wins */}
          {Object.keys(stats.tokenWins).length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-border">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Token Wins 💰</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.tokenWins).map(([token, wins]) => (
                  <span
                    key={token}
                    className="text-xs font-black px-3 py-1 rounded-full bg-primary/10 text-primary"
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
        <div className="text-center py-4">
          <div className="text-3xl mb-2">😬</div>
          <p className="text-sm font-semibold text-muted">
            No stats found. Go play some QRbase games first fren!
          </p>
        </div>
      )}
    </div>
  );
}
