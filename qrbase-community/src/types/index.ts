export interface GameStatus {
  userId: string;
  winsAllTime: number;
  winsToday: number;
  level: number;
  winRate: number;
  totalPlays: number;
  totalLosses: number;
  tokenWins: Record<string, number>;
  progressToNextLevel: number;
  displayName: string;
  profilePhoto: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  winsAllTime: number;
  level: number;
  winRate: number;
}

export type ConnectedIdentity = {
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
} | null;
