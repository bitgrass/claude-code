import type { GameStatus, LeaderboardEntry, SkilledEntry, SpendersEntry, ReferralEntry, ActiveTask, PointsEntry } from "@/types";

// Server-side: call worker directly (API key never reaches the client)
const WORKER = process.env.GAME_WORKER_URL ?? "https://puzzlegame.bitgrass-crypto.workers.dev";
const KEY    = process.env.GAME_API_KEY    ?? "";

function workerHeaders() {
  return { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
}

function parsePlatform(userId: string): { handle: string; platform: "twitter" | "farcaster" } {
  const [prefix, ...rest] = userId.split(":");
  return {
    handle: rest.join(":") || userId,
    platform: prefix === "fc" ? "farcaster" : "twitter",
  };
}

// ─── Game status (client-safe — calls app proxy so API key stays server-side) ─
export async function getGameStatus(
  handle: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<GameStatus | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  try {
    const res = await fetch(
      `/api/status?userId=${encodeURIComponent(`${prefix}:${handle}`)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: GameStatus };
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// ─── Wins leaderboard (server-side, initial render) ───────────────────────
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(
      `${WORKER}/leaderboard?limit=${limit}&tab=wins`,
      { headers: workerHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        username: string;
        avatar: string | null;
        wins: number;           // real field name from worker
        totalPlays: number;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((p, i) => {
      const { handle, platform } = parsePlatform(p.userId);
      return {
        rank: i + 1,
        handle,
        platform,
        displayName: p.username,
        profilePhoto: p.avatar ?? null,
        winsAllTime:  p.wins ?? 0,
        level:        0,            // not in wins tab; loaded separately in skilled tab
        winRate:      0,
        totalPlays:   p.totalPlays ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Skilled leaderboard (server-side, initial render) ───────────────────
export async function getSkilledLeaderboardServer(limit = 50): Promise<SkilledEntry[]> {
  try {
    const res = await fetch(
      `${WORKER}/leaderboard?limit=${limit}&tab=skilled`,
      { headers: workerHeaders(), next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        username: string;
        avatar: string | null;
        level: number;
        winRate: number;
        totalPlays: number;
        winsAllTime: number;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((p, i) => {
      const { handle, platform } = parsePlatform(p.userId);
      return {
        rank: i + 1,
        handle,
        platform,
        displayName: p.username,
        profilePhoto: p.avatar ?? null,
        level:      p.level ?? 1,
        winRate:    p.winRate ?? 0,   // already a percentage
        totalPlays: p.totalPlays ?? 0,
        winsAllTime: p.winsAllTime ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Client-side helpers (call the community app's own proxy routes) ───────
// These are called from client components — API key stays server-side.

export async function getSkilledLeaderboard(limit = 50): Promise<SkilledEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?tab=skilled&limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        username: string;
        avatar: string | null;
        level: number;
        winRate: number;      // already a percentage (e.g. 95.6)
        totalPlays: number;
        winsAllTime: number;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((p, i) => {
      const { handle, platform } = parsePlatform(p.userId);
      return {
        rank: i + 1,
        handle,
        platform,
        displayName: p.username,
        profilePhoto: p.avatar ?? null,
        level:      p.level ?? 1,
        winRate:    Math.round(p.winRate ?? 0),   // already %, just round
        totalPlays: p.totalPlays ?? 0,
        winsAllTime: p.winsAllTime ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getSpendersLeaderboard(limit = 50): Promise<SpendersEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?tab=spenders&limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        username: string;
        avatar: string | null;
        totalBoughtAttempts: number;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((p, i) => {
      const { handle, platform } = parsePlatform(p.userId);
      return {
        rank: i + 1,
        handle,
        platform,
        displayName: p.username,
        profilePhoto: p.avatar ?? null,
        totalBoughtAttempts: p.totalBoughtAttempts ?? 0,
      };
    });
  } catch {
    return [];
  }
}

export async function getReferralLeaderboard(limit = 50): Promise<ReferralEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?tab=referral_refs&limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        username: string;
        avatar: string | null;
        totalReferrals: number;
        totalEarnings: number;
        pendingEarnings?: number;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((p, i) => {
      const { handle, platform } = parsePlatform(p.userId);
      return {
        rank: i + 1,
        handle,
        platform,
        displayName: p.username,
        profilePhoto: p.avatar ?? null,
        totalReferrals:  p.totalReferrals  ?? 0,
        totalEarnings:   p.totalEarnings   ?? 0,
        pendingEarnings: p.pendingEarnings ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Points leaderboard (server-side) — aggregates wins + spenders + referrals ─
// Points formula (LIVE sources only — more will be added as worker exposes new tabs):
//   winsAllTime            × 100  (puzzle wins)         LIVE
//   (level - 1)            × 50   (level bonus)         LIVE
//   totalReferrals         × 75   (referrals)           LIVE
//   totalBoughtAttempts    × 10   (attempt purchases)   LIVE
//
// COMING SOON (when worker tabs are available):
//   campaignsCreated       × 2000 (create campaign / full scan-mode page)
//   puzzleGamesCreated     × 500  (create simple puzzle game)
//   tasksCreated           × 300  (create social task as promoter)
//   scanModeWins           × 150  (win on scan mode page)
//   boostsBought           × 100  (boost token purchased)
//   taskCompletions        × 25   (complete a task)
//   scanHoldings           × 5    (per 1,000 $SCAN held / day)
export async function getPointsLeaderboard(limit = 50): Promise<PointsEntry[]> {
  const FETCH_LIMIT     = 100;
  const PTS_PER_WIN      = 100;
  const PTS_PER_LEVEL    = 50;
  const PTS_PER_REFERRAL = 75;
  const PTS_PER_ATTEMPT  = 10;

  async function fetchTab(tab: string): Promise<Array<Record<string, unknown>>> {
    try {
      const res = await fetch(`${WORKER}/leaderboard?tab=${tab}&limit=${FETCH_LIMIT}`, {
        headers: workerHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { success: boolean; data?: Array<Record<string, unknown>> };
      return data.success && data.data ? data.data : [];
    } catch {
      return [];
    }
  }

  const [skilled, spenders, referrals] = await Promise.all([
    fetchTab("skilled"),
    fetchTab("spenders"),
    fetchTab("referral_refs"),
  ]);

  type Row = {
    userId: string; username: string; avatar: string | null;
    winsAllTime: number; level: number;
    totalBoughtAttempts: number; totalReferrals: number;
  };

  const map = new Map<string, Row>();

  for (const p of skilled) {
    map.set(p.userId as string, {
      userId: p.userId as string, username: p.username as string, avatar: (p.avatar as string | null) ?? null,
      winsAllTime: (p.winsAllTime as number) ?? 0, level: (p.level as number) ?? 1,
      totalBoughtAttempts: 0, totalReferrals: 0,
    });
  }
  for (const p of spenders) {
    const e = map.get(p.userId as string);
    if (e) { e.totalBoughtAttempts = (p.totalBoughtAttempts as number) ?? 0; }
    else {
      map.set(p.userId as string, {
        userId: p.userId as string, username: p.username as string, avatar: (p.avatar as string | null) ?? null,
        winsAllTime: 0, level: 1,
        totalBoughtAttempts: (p.totalBoughtAttempts as number) ?? 0, totalReferrals: 0,
      });
    }
  }
  for (const p of referrals) {
    const e = map.get(p.userId as string);
    if (e) { e.totalReferrals = (p.totalReferrals as number) ?? 0; }
    else {
      map.set(p.userId as string, {
        userId: p.userId as string, username: p.username as string, avatar: (p.avatar as string | null) ?? null,
        winsAllTime: 0, level: 1,
        totalBoughtAttempts: 0, totalReferrals: (p.totalReferrals as number) ?? 0,
      });
    }
  }

  return Array.from(map.values())
    .map((p) => {
      const ptsFromWins      = p.winsAllTime * PTS_PER_WIN;
      const ptsFromLevel     = Math.max(0, p.level - 1) * PTS_PER_LEVEL;
      const ptsFromReferrals = p.totalReferrals * PTS_PER_REFERRAL;
      const ptsFromAttempts  = p.totalBoughtAttempts * PTS_PER_ATTEMPT;
      const { handle, platform } = parsePlatform(p.userId);
      return {
        handle, platform,
        displayName: p.username, profilePhoto: p.avatar,
        winsAllTime: p.winsAllTime, level: p.level,
        totalBoughtAttempts: p.totalBoughtAttempts, totalReferrals: p.totalReferrals,
        ptsFromWins, ptsFromLevel, ptsFromReferrals, ptsFromAttempts,
        totalPoints: ptsFromWins + ptsFromLevel + ptsFromReferrals + ptsFromAttempts,
        rank: 0,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

export async function getActiveTasks(userId?: string): Promise<ActiveTask[]> {
  try {
    const url = userId
      ? `/api/tasks?userId=${encodeURIComponent(userId)}`
      : "/api/tasks";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        id: string;
        platform: "x" | "farcaster";
        taskType: string;
        label: string;
        actionsBundled: string;
        targetLink: string;
        price: number;
        maxCompletions: number;
        completionsCount: number;
        expiresAt: string;
        promoterName: string | null;
        promoterPhoto: string | null;
        completedByUser: boolean;
      }>;
    };
    if (!data.success || !data.data) return [];
    return data.data.map((t) => ({
      id:               t.id,
      platform:         t.platform,
      taskType:         t.taskType,
      label:            t.label,
      actionsBundled:   t.actionsBundled,
      targetLink:       t.targetLink,
      price:            t.price,
      maxCompletions:   t.maxCompletions,
      completionsCount: t.completionsCount,
      expiresAt:        t.expiresAt,
      promoterName:     t.promoterName,
      promoterPhoto:    t.promoterPhoto,
      completedByUser:  t.completedByUser ?? false,
    }));
  } catch {
    return [];
  }
}
