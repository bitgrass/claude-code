export enum SplitType {
  EQUAL = "EQUAL",
  RANDOM = "RANDOM",
}

export interface AntiBot {
  minAccountAgeDays: number;
  minFollowers: number;
  minFollowing: number;
  requireVerified: boolean;
}

export interface CampaignData {
  id: string;
  onChainId: number;
  creatorWallet: string;
  creatorTwitter: string | null;
  totalAmount: bigint;
  maxRecipients: number;
  splitType: SplitType;
  isActive: boolean;
  antiBot: AntiBot;
  createdAt: string;
  closedAt: string | null;
  claimedCount: number;
  remainingAmount: bigint;
}

export interface ClaimData {
  id: string;
  twitterId: string;
  twitterHandle: string;
  walletAddress: string;
  amount: bigint;
  txHash: string | null;
  claimedAt: string;
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  created_at: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
  verified: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  failedRule?: string;
}

export interface ClaimAuthorization {
  campaignId: number;
  recipient: string;
  twitterId: string;
  amount: string;
  signature: string;
}
