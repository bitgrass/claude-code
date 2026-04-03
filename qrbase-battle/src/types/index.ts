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
  totalPlays?: number;
}

export interface SkilledEntry {
  rank: number;
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  level: number;
  winRate: number;
  totalPlays: number;
  winsAllTime: number;
}

export interface SpendersEntry {
  rank: number;
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  totalBoughtAttempts: number;
}

export interface ReferralEntry {
  rank: number;
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

export interface ActiveTask {
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
}

export interface PointsEntry {
  rank: number;
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  totalPoints: number;
  ptsFromWins: number;
  ptsFromLevel: number;
  ptsFromReferrals: number;
  ptsFromAttempts: number;
  winsAllTime: number;
  level: number;
  totalReferrals: number;
  totalBoughtAttempts: number;
}

export type ConnectedIdentity = {
  handle: string;
  platform: "twitter" | "farcaster";
  displayName: string;
  profilePhoto: string | null;
  walletAddress: string | null;
} | null;
