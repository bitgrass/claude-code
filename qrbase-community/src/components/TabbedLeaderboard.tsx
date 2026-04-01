"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { LeaderboardEntry, SkilledEntry, SpendersEntry, ReferralEntry, PointsEntry } from "@/types";
import {
  getSkilledLeaderboard,
  getSpendersLeaderboard,
  getReferralLeaderboard,
} from "@/lib/qrbase-api";

// ─── Shared helpers ────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: "twitter" | "farcaster" }) {
  return platform === "farcaster" ? (
    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">FC</span>
  ) : (
    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-surface-muted text-muted">𝕏</span>
  );
}

function Avatar({ photo, handle, size = 32 }: { photo: string | null; handle: string; size?: number }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={handle}
        width={size}
        height={size}
        className="rounded-full ring-2 ring-border flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-surface-muted border-2 border-border flex items-center justify-center text-muted text-xs font-black flex-shrink-0"
    >
      {handle[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-sm font-black px-2 py-1 rounded-xl bg-primary text-white">👑 #1</span>;
  if (rank === 2) return <span className="text-sm font-black px-2 py-1 rounded-xl bg-surface-muted text-gray-700">🥈 #2</span>;
  if (rank === 3) return <span className="text-sm font-black px-2 py-1 rounded-xl bg-surface-muted text-gray-700">🥉 #3</span>;
  return <span className="text-sm font-bold text-muted">#{rank}</span>;
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-2 rounded-full bg-surface-muted overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{rate}%</span>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  const isBg = level >= 8 ? "bg-primary text-white" : level >= 5 ? "bg-accent-purple/10 text-accent-purple" : "bg-surface-muted text-muted";
  return (
    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isBg}`}>
      Lv.{level}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 rounded-2xl bg-surface-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-5xl animate-bounce">🤖</span>
      <p className="font-extrabold text-gray-900">{msg}</p>
    </div>
  );
}

// ─── Tab: Points (WL board) ─────────────────────────────────────────────────

function PointsTable({ entries }: { entries: PointsEntry[] }) {
  if (!entries.length) return <EmptyState msg="No ranked players yet — go earn some points!" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-surface-muted">
            {["Rank", "Player", "Total Points", "Breakdown", "WL"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={`${e.platform}-${e.handle}`}
              className={`border-b border-border/50 hover:bg-surface-muted transition-colors ${
                e.rank <= 3 ? "bg-primary/3" : e.rank <= 50 ? "bg-green-50/40" : ""
              }`}
            >
              <td className="py-3 px-4 whitespace-nowrap"><RankBadge rank={e.rank} /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <Avatar photo={e.profilePhoto} handle={e.handle} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{e.displayName || `@${e.handle}`}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted">@{e.handle}</span>
                      <PlatformBadge platform={e.platform} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl text-primary tabular-nums">
                    {e.totalPoints.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted font-semibold">pts</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {e.ptsFromWins > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                      🧩 {e.ptsFromWins.toLocaleString()}
                    </span>
                  )}
                  {e.ptsFromReferrals > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple whitespace-nowrap">
                      👥 {e.ptsFromReferrals.toLocaleString()}
                    </span>
                  )}
                  {e.ptsFromAttempts > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-surface-muted text-muted whitespace-nowrap">
                      🎯 {e.ptsFromAttempts.toLocaleString()}
                    </span>
                  )}
                  {e.ptsFromLevel > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-surface-muted text-gray-600 whitespace-nowrap">
                      ⭐ {e.ptsFromLevel.toLocaleString()}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {e.rank <= 50 ? (
                  <span className="text-xs font-black px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                    ✅ WL
                  </span>
                ) : (
                  <span className="text-xs font-bold text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Wins ─────────────────────────────────────────────────────────────

function WinsTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) return <EmptyState msg="No ranked players yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-surface-muted">
            {["Rank", "Player", "Wins", "Plays"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={`${e.platform}-${e.handle}`}
              className={`border-b border-border/50 hover:bg-surface-muted transition-colors ${e.rank <= 3 ? "bg-primary/3" : ""}`}
            >
              <td className="py-3 px-4 whitespace-nowrap"><RankBadge rank={e.rank} /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <Avatar photo={e.profilePhoto} handle={e.handle} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{e.displayName || `@${e.handle}`}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted">@{e.handle}</span>
                      <PlatformBadge platform={e.platform} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="font-black text-gray-900">{(e.winsAllTime ?? 0).toLocaleString()}</span>
                {e.rank <= 3 && <span className="ml-1 text-xs">🔥</span>}
              </td>
              <td className="py-3 px-4 text-sm font-bold text-muted">{(e.totalPlays ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Skill ────────────────────────────────────────────────────────────

function SkilledTable({ entries }: { entries: SkilledEntry[] }) {
  if (!entries.length) return <EmptyState msg="No ranked players yet" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-surface-muted">
            {["Rank", "Player", "Level", "Win Rate", "Plays", "Wins"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={`${e.platform}-${e.handle}`}
              className={`border-b border-border/50 hover:bg-surface-muted transition-colors ${e.rank <= 3 ? "bg-accent-purple/5" : ""}`}
            >
              <td className="py-3 px-4 whitespace-nowrap"><RankBadge rank={e.rank} /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <Avatar photo={e.profilePhoto} handle={e.handle} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{e.displayName || `@${e.handle}`}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted">@{e.handle}</span>
                      <PlatformBadge platform={e.platform} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4"><LevelBadge level={e.level} /></td>
              <td className="py-3 px-4"><WinRateBar rate={e.winRate} /></td>
              <td className="py-3 px-4 text-sm font-bold text-muted">{e.totalPlays.toLocaleString()}</td>
              <td className="py-3 px-4 font-black text-gray-900">{e.winsAllTime.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Spenders ─────────────────────────────────────────────────────────

function SpendersTable({ entries }: { entries: SpendersEntry[] }) {
  if (!entries.length) return <EmptyState msg="No spenders yet — ngmi if you haven't bought attempts" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-surface-muted">
            {["Rank", "Player", "Attempts Bought", "$SCAN Burned"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const scanBurned = e.totalBoughtAttempts * 1000;
            return (
              <tr
                key={`${e.platform}-${e.handle}`}
                className={`border-b border-border/50 hover:bg-surface-muted transition-colors ${e.rank <= 3 ? "bg-primary/3" : ""}`}
              >
                <td className="py-3 px-4 whitespace-nowrap"><RankBadge rank={e.rank} /></td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar photo={e.profilePhoto} handle={e.handle} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{e.displayName || `@${e.handle}`}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted">@{e.handle}</span>
                        <PlatformBadge platform={e.platform} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-gray-900">{e.totalBoughtAttempts.toLocaleString()}</span>
                    <span className="text-xs">🎯</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-black text-primary">{scanBurned.toLocaleString()} $SCAN</span>
                  {e.rank <= 3 && <span className="ml-1 text-xs">💎</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tab: Referrers ────────────────────────────────────────────────────────

function ReferralTable({ entries }: { entries: ReferralEntry[] }) {
  if (!entries.length) return <EmptyState msg="No referrers yet — share your link fren" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-surface-muted">
            {["Rank", "Player", "Referrals", "Total Earned", "Pending"].map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={`${e.platform}-${e.handle}`}
              className={`border-b border-border/50 hover:bg-surface-muted transition-colors ${e.rank <= 3 ? "bg-accent-purple/5" : ""}`}
            >
              <td className="py-3 px-4 whitespace-nowrap"><RankBadge rank={e.rank} /></td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2.5">
                  <Avatar photo={e.profilePhoto} handle={e.handle} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{e.displayName || `@${e.handle}`}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted">@{e.handle}</span>
                      <PlatformBadge platform={e.platform} />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <span className="font-black text-gray-900">{e.totalReferrals}</span>
                  <span className="text-xs">👥</span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className="font-black text-accent-purple">{e.totalEarnings.toLocaleString()} $SCAN</span>
              </td>
              <td className="py-3 px-4">
                <span className={`font-bold text-sm ${e.pendingEarnings > 0 ? "text-primary" : "text-muted"}`}>
                  {e.pendingEarnings.toLocaleString()} $SCAN
                  {e.pendingEarnings > 0 && " ⏳"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main TabbedLeaderboard ─────────────────────────────────────────────────

const TABS = [
  { id: "points",   label: "🎯 Points",    desc: "WL board · top 50"  },
  { id: "wins",     label: "🏆 Wins",      desc: "All-time wins"       },
  { id: "skilled",  label: "🧠 Skill",     desc: "Level & win rate"    },
  { id: "spenders", label: "💸 Spenders",  desc: "Attempts bought"     },
  { id: "referral", label: "👥 Referrers", desc: "Referral kings"      },
] as const;

type TabId = typeof TABS[number]["id"];

export function TabbedLeaderboard({
  winsData,
  pointsData,
}: {
  winsData: LeaderboardEntry[];
  pointsData: PointsEntry[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("points");
  const [skilled,   setSkilled]   = useState<SkilledEntry[]>([]);
  const [spenders,  setSpenders]  = useState<SpendersEntry[]>([]);
  const [referral,  setReferral]  = useState<ReferralEntry[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [fetched,   setFetched]   = useState<Set<TabId>>(new Set(["points", "wins"]));

  const loadTab = useCallback(async (tab: TabId) => {
    if (fetched.has(tab)) return;
    setLoading(true);
    try {
      if (tab === "skilled")  setSkilled(await getSkilledLeaderboard(50));
      if (tab === "spenders") setSpenders(await getSpendersLeaderboard(50));
      if (tab === "referral") setReferral(await getReferralLeaderboard(50));
      setFetched((prev) => new Set([...prev, tab]));
    } finally {
      setLoading(false);
    }
  }, [fetched]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  return (
    <div className="rounded-3xl border-2 border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b-2 border-border bg-surface-muted flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏆</span>
          <span className="font-extrabold text-gray-900">Leaderboard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
            ✅ Top 50 = NFT WL
          </span>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-white border border-border text-muted">
            {pointsData.length} ranked
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b-2 border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-3.5 text-xs font-black whitespace-nowrap transition-all border-b-2 -mb-0.5 ${
              activeTab === t.id
                ? t.id === "points"
                  ? "border-green-500 text-green-700 bg-green-50/60"
                  : "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted hover:text-gray-700 hover:bg-surface-muted"
            }`}
          >
            {t.label}
            <span className="hidden sm:inline ml-1 font-normal opacity-60">· {t.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[300px]">
        {loading && !fetched.has(activeTab) ? (
          <Skeleton />
        ) : (
          <>
            {activeTab === "points"   && <PointsTable  entries={pointsData} />}
            {activeTab === "wins"     && <WinsTable    entries={winsData}   />}
            {activeTab === "skilled"  && <SkilledTable entries={skilled}    />}
            {activeTab === "spenders" && <SpendersTable entries={spenders}  />}
            {activeTab === "referral" && <ReferralTable entries={referral}  />}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t-2 border-border bg-surface-muted text-center">
        {activeTab === "points" ? (
          <p className="text-xs text-muted font-semibold">
            Points board is the <span className="font-black text-green-700">official WL board</span> — top 50 get guaranteed NFT whitelist spots 🎁
            <span className="block mt-0.5 text-[10px]">More point sources coming soon: campaigns, boosts, scan-mode wins, task creation, $SCAN holdings</span>
          </p>
        ) : (
          <p className="text-xs text-muted font-semibold">
            Check the <span className="font-black text-green-700">Points tab</span> for NFT whitelist rankings 🎁
          </p>
        )}
      </div>
    </div>
  );
}
