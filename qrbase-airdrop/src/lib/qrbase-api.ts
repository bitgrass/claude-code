const GAME_BASE = "https://beta.qrbase.xyz/api/game";
const GAME_API_KEY = process.env.GAME_PUBLIC_API_KEY ?? "pub_qrbase_ext_7f8k2mX9pLwR4vNz";

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

export interface ScanModeTask {
  id: number;
  platform: string;
  taskType: string;
  targetLink: string;
  label: string;
  completedByUser: boolean;
}

export interface ScanModeProgress {
  partnerName: string;
  taskGatePassed: boolean;
  campaignTasks: ScanModeTask[];
  userLevel: number;
  userPartnerWins: number;
}

export async function getGameStatus(
  handle: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<QRbaseGameStatus | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  const userId = encodeURIComponent(`${prefix}:${handle}`);
  const url = `${GAME_BASE}/public/status?userId=${userId}`;

  try {
    const response = await fetch(url, {
      headers: { "x-api-key": GAME_API_KEY },
      cache: "no-store",
    });
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

export async function getScanModeProgress(
  partnerName: string,
  handle: string,
  walletAddress: string,
  platform: "twitter" | "farcaster" = "twitter"
): Promise<ScanModeProgress | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  const userId = encodeURIComponent(`${prefix}:${handle}`);
  const url = `${GAME_BASE}/scanMode/progress?partnerName=${encodeURIComponent(partnerName)}&userId=${userId}&walletAddress=${walletAddress}`;

  try {
    const response = await fetch(url, {
      headers: { "x-api-key": GAME_API_KEY },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`QRbase scanMode progress error: ${response.status} for ${partnerName}/${handle}`);
      return null;
    }
    const data = await response.json() as { success: boolean; data: ScanModeProgress };
    return data.success ? data.data : null;
  } catch (err) {
    console.error("getScanModeProgress error:", err);
    return null;
  }
}
