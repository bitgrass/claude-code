export interface EligibilityRule {
  type: "puzzle_wins" | "token_balance";
  token: string;
  min: number;
}

export interface RewardTier {
  position: number;
  amount: number; // USDC in 6 decimals
}

export interface CampaignData {
  id: string;
  onChainId: number;
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
}

export interface EligibilityCheck {
  rule: string;
  passed: boolean;
  current: number | string;
  required: number | string;
}

export interface EligibilityResponse {
  eligible: boolean;
  checks: EligibilityCheck[];
  reason?: string;
  signedAuth?: string;
  claimAmount?: string;
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
  }[];
}

export type ClaimPageState =
  | "LOADING"
  | "CAMPAIGN_FULL"
  | "CAMPAIGN_CLOSED"
  | "NOT_LOGGED_IN"
  | "LOGGED_IN_NO_WALLET"
  | "CHECKING_ELIGIBILITY"
  | "INELIGIBLE"
  | "ALREADY_CLAIMED"
  | "ELIGIBLE_READY_TO_CLAIM"
  | "CLAIMING"
  | "CLAIMED_SUCCESS";
