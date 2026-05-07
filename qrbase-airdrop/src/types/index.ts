export interface EligibilityRule {
  type: "puzzle_wins" | "token_balance" | "min_level" | "min_wins" | "min_winrate" | "social_task";
  token?: string;
  tokenAddress?: string;
  taskId?: string;
  label?: string;
  url?: string;
  platform?: string;
  verificationUrl?: string;
  min: number;
  minUsd?: number; // when set, min is ignored for token_balance — check USD value instead
}

export interface RewardTier {
  position: number;
  amount: number; // USDC in 6 decimals
}

export interface CampaignData {
  id: string;
  onChainId: string;
  name: string;
  tokenSymbol: string;
  tokenAddress: string;
  totalUsdc: string;
  maxRecipients: number;
  tiers: RewardTier[];
  eligibilityRules: EligibilityRule[];
  isActive: boolean;
  createdAt: string;
  closedAt: string | null;
  claimedCount: number;
}

export interface ClaimData {
  id: string;
  twitterId: string;
  twitterHandle: string;
  walletAddress: string;
  usdcAmount: string;
  slotNumber: number;
  txHash: string | null;
  claimedAt: string;
  platform?: "twitter" | "farcaster";
  avatar?: string | null;
}

export interface EligibilityCheck {
  rule: string;
  passed: boolean;
  current: number | string;
  required: number | string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface EligibilityResponse {
  eligible: boolean;
  checks: EligibilityCheck[];
  reason?: string;
  signedAuth?: string;
  claimAmount?: string;
  resolvedRecipient?: string;
}

export interface CampaignStatusResponse {
  slotsRemaining: number;
  totalSlots: number;
  claimedCount: number;
  nextRewardAmount: string | null;
  isActive: boolean;
  recentClaims: {
    handle: string;
    slotNumber: number;
    amount: string;
    time: string;
    platform: "twitter" | "farcaster";
    avatar: string | null;
  }[];
}

export type ClaimPageState =
  | "LOADING"
  | "CAMPAIGN_FULL"
  | "CAMPAIGN_CLOSED"
  | "NOT_LOGGED_IN"
  | "CHECKING_ELIGIBILITY"
  | "INELIGIBLE"
  | "ALREADY_CLAIMED"
  | "ELIGIBLE_NEED_WALLET"
  | "ELIGIBLE_READY_TO_CLAIM"
  | "CLAIMING"
  | "CLAIMED_SUCCESS";
