"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getGameStatus } from "@/lib/qrbase-api";
import type { LeaderboardEntry, GameStatus } from "@/types";
import Image from "next/image";

function Avatar({ photo, handle, size = 28 }: { photo: string | null; handle: string; size?: number }) {
  if (photo) return <Image src={photo} alt={handle} width={size} height={size} className="rounded-full ring-2 ring-border" />;
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-surface-muted border-2 border-border flex items-center justify-center text-muted text-xs font-black flex-shrink-0"
    >
      {handle[0].toUpperCase()}
    </div>
  );
}

function SignInCTA({ topPlayers }: { topPlayers: LeaderboardEntry[] }) {
  return (
    <div className="rounded-3xl border-2 border-border bg-white p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="text-6xl animate-float inline-block">🤖</div>
        <h3 className="font-black text-gray-900 text-xl">Your rank awaits, fren</h3>
        <p className="text-sm text-muted">Sign in to claim your spot on the board</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Top 3 rn 👀</p>
        {topPlayers.slice(0, 3).map((p) => (
          <div key={`${p.platform}-${p.handle}`} className="flex items-center gap-3 p-2.5 rounded-2xl bg-surface-muted">
            <span className="text-base font-black w-6 text-center">
              {p.rank === 1 ? "👑" : p.rank === 2 ? "🥈" : "🥉"}
            </span>
            <Avatar photo={p.profilePhoto} handle={p.handle} size={28} />
            <span className="font-bold text-sm text-gray-900 flex-1 truncate">@{p.handle}</span>
            <span className="text-xs font-black text-primary">{(p.winsAllTime ?? 0).toLocaleString()} W</span>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted font-semibold">
        👆 hit sign in top-right to see your rank
      </p>
    </div>
  );
}

export function UserRankPanel({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const { identity } = useAuth();
  const [stats, setStats] = useState<GameStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const userRank = identity
    ? leaderboard.find(
        (e) =>
          e.handle.toLowerCase() === identity.handle.toLowerCase() &&
          e.platform === identity.platform
      )
    : null;

  useEffect(() => {
    if (!identity) return;
    setLoading(true);
    getGameStatus(identity.handle, identity.platform)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [identity]);

  if (!identity) return <SignInCTA topPlayers={leaderboard} />;

  const rankBg =
    (userRank?.rank ?? 999) <= 10
      ? "bg-primary text-white"
      : (userRank?.rank ?? 999) <= 50
      ? "bg-accent-purple text-white"
      : "bg-surface-muted text-gray-900";

  const rankMsg =
    !userRank             ? "unranked — go play! 👊"
    : userRank.rank === 1 ? "👑 #1 absolute unit"
    : userRank.rank <= 3  ? "🔥 top 3 built diff"
    : userRank.rank <= 10 ? "⭐ top 10 legend"
    : userRank.rank <= 50 ? "🎁 top 50 — WL locked!"
    : "keep grinding fren 👊";

  return (
    <div className="rounded-3xl border-2 border-border bg-white p-6 space-y-4">
      {/* Rank badge row */}
      <div className="flex items-center gap-3">
        <div className={`px-5 py-3 rounded-2xl font-black text-3xl tabular-nums ${rankBg}`}>
          {userRank ? `#${userRank.rank}` : "?"}
        </div>
        <div className="leading-tight">
          <p className="font-black text-gray-900 text-sm">{rankMsg}</p>
          <p className="text-xs text-muted">of {leaderboard.length} players</p>
        </div>
      </div>

      {/* User row */}
      <div className="flex items-center gap-3 pb-4 border-b-2 border-border">
        <Avatar photo={identity.profilePhoto} handle={identity.handle} size={48} />
        <div className="min-w-0">
          <p className="font-black text-gray-900">@{identity.handle}</p>
          <p className="text-xs text-muted">
            {identity.platform === "twitter" ? "𝕏 Twitter" : "🟣 Farcaster"}
            {stats && <span className="ml-2 font-black text-primary">Lv.{stats.level} 🤖</span>}
          </p>
          {identity.walletAddress ? (
            <p className="text-[10px] font-mono text-muted mt-0.5 truncate">
              🔗 {identity.walletAddress.slice(0, 6)}…{identity.walletAddress.slice(-4)}
            </p>
          ) : (
            <p className="text-[10px] text-muted mt-0.5">⚠️ No wallet linked</p>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🏆", val: stats.winsAllTime,                         label: "All-Time Wins" },
              { icon: "⚡", val: stats.winsToday,                            label: "Today's Wins"  },
              { icon: "🎯", val: `${Math.round(stats.winRate * 100)}%`,      label: "Win Rate"      },
              { icon: "🎮", val: stats.totalPlays,                           label: "Total Plays"   },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 bg-surface-muted border border-border">
                <span className="text-lg">{s.icon}</span>
                <p className="text-xl font-black text-gray-900">{s.val}</p>
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Level bar */}
          <div>
            <div className="flex justify-between text-xs font-bold text-muted mb-1.5">
              <span>Level {stats.level} → {stats.level + 1}</span>
              <span>{Math.round(stats.progressToNextLevel * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all duration-700"
                style={{ width: `${Math.round(stats.progressToNextLevel * 100)}%` }}
              />
            </div>
          </div>

          {/* Token wins */}
          {Object.keys(stats.tokenWins).length > 0 && (
            <div className="pt-3 border-t-2 border-border">
              <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Token Wins 💰</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(stats.tokenWins).map(([token, wins]) => (
                  <span key={token} className="text-xs font-black px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    ${token}: {wins}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !stats && (
        <p className="text-center text-sm text-muted font-semibold py-3">
          no stats yet — go play some QRs fren 😬
        </p>
      )}

      {/* WL banner */}
      {userRank && userRank.rank <= 50 && (
        <div className="rounded-2xl p-3 bg-primary text-white text-center">
          <p className="text-xs font-black">🎁 WL spot guaranteed — top 50 on Points board locked in!</p>
        </div>
      )}
    </div>
  );
}
