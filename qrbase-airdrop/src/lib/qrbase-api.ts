export interface QRbaseGameStatus {
  userId: string;
  freeChances: number;
  paidChances: number;
  totalChances: number;
  canPlay: boolean;
  winsToday: number;
  winsAllTime: number;
  level: number;
  winRate: number;
  totalPlays: number;
  totalLosses: number;
  tokenWins: Record<string, number>;
  progressToNextLevel: number;
  displayName: string;
  profilePhoto: string | null;
}

export async function getGameStatus(
  handle: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<QRbaseGameStatus | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  const url = `https://www.qrbase.xyz/api/game/status?userId=${prefix}:${handle}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`QRbase game status error: ${response.status} for ${handle}`);
      return null;
    }
    const data = await response.json() as { success: boolean; data: QRbaseGameStatus };
    return data.success ? data.data : null;
  } catch (err) {
    console.error("getGameStatus error:", err);
    return null;
  }
}
