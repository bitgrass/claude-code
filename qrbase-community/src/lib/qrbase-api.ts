import type { GameStatus, LeaderboardEntry } from "@/types";

export async function getGameStatus(
  handle: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<GameStatus | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  const url = `https://www.qrbase.xyz/api/game/status?userId=${prefix}:${handle}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { success: boolean; data: GameStatus };
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

// Leaderboard: fetch top N players from QRbase API
// Falls back to empty array if endpoint not available
export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  try {
    const url = `https://www.qrbase.xyz/api/game/leaderboard?limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      success: boolean;
      data: Array<{
        userId: string;
        displayName: string;
        profilePhoto: string | null;
        winsAllTime: number;
        level: number;
        winRate: number;
      }>;
    };
    if (!data.success) return [];
    return data.data.map((p, i) => {
      const [prefix, handle] = p.userId.split(":");
      return {
        rank: i + 1,
        handle: handle || p.userId,
        platform: prefix === "fc" ? "farcaster" : "twitter",
        displayName: p.displayName,
        profilePhoto: p.profilePhoto,
        winsAllTime: p.winsAllTime,
        level: p.level,
        winRate: Math.round(p.winRate * 100),
      };
    });
  } catch {
    return [];
  }
}
