const GAME_BASE = "https://www.qrbase.xyz/api/game";
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
  // Extra fields returned by qrbase, used for the token-hold check.
  contractAddress?: string;
  // Which chain the partner token lives on (e.g. "base", "robinhood",
  // "solana"). Required when reading the balance — qrbase only auto-detects
  // Solana, so EVM tokens MUST pass this or the balance comes back 0.
  tokenChain?: string;
  tokenSymbol?: string;
  tokenPriceUsd?: number;
  minTokenHold?: number;
  minPartnerPuzzles?: number;
  minLevel?: number;
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
  platform: "twitter" | "farcaster" = "twitter",
  contractAddress: string = ""
): Promise<ScanModeProgress | null> {
  const prefix = platform === "farcaster" ? "fc" : "x";
  const userId = encodeURIComponent(`${prefix}:${handle}`);
  // qrbase now keys progress off the token contractAddress (from the campaign's
  // eligibility rule) to disambiguate multiple campaigns sharing a partnerName.
  let url = `${GAME_BASE}/scanMode/progress?partnerName=${encodeURIComponent(partnerName)}&userId=${userId}&walletAddress=${walletAddress}`;
  if (contractAddress) url += `&contractAddress=${encodeURIComponent(contractAddress)}`;

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

// Partner-token balance for a wallet, via qrbase. Works for every chain qrbase
// supports (base, robinhood, solana, …). IMPORTANT: `chain` must be passed for
// EVM tokens — qrbase only auto-detects Solana, and without it an EVM token on a
// non-default chain silently returns 0. The value comes from the progress
// endpoint's `tokenChain`. Returns the human token amount, or 0 on failure.
export async function getScanModeTokenBalance(
  walletAddress: string,
  tokenAddress: string,
  chain: string = ""
): Promise<number> {
  if (!walletAddress || !tokenAddress) return 0;
  let url = `${GAME_BASE}/scanMode/tokenBalance?address=${encodeURIComponent(walletAddress)}&token=${encodeURIComponent(tokenAddress)}`;
  if (chain) url += `&chain=${encodeURIComponent(chain)}`;
  try {
    const response = await fetch(url, {
      headers: { "x-api-key": GAME_API_KEY },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`QRbase tokenBalance error: ${response.status} for ${walletAddress}/${tokenAddress}`);
      return 0;
    }
    const data = await response.json() as { success: boolean; balance?: number };
    return data.success ? Number(data.balance ?? 0) : 0;
  } catch (err) {
    console.error("getScanModeTokenBalance error:", err);
    return 0;
  }
}
