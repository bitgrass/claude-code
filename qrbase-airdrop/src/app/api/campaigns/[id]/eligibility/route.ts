import { NextRequest, NextResponse } from "next/server";
import type { Campaign } from "@prisma/client";
import { getDb } from "@/lib/db";
import { evaluateEligibility } from "@/lib/eligibility";
import { getFarcasterWallets } from "@/lib/neynar";
import { rateLimit, cacheGet, cacheSet } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";
import type { EligibilityRule, RewardTier } from "@/types";

// POST /api/campaigns/[id]/eligibility — Check eligibility + sign auth
async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const { walletAddress, eligibilityWallet, solanaWallet = "", twitterId, twitterHandle, platform = "twitter" } = await req.json() as {
      walletAddress: string;       // claim wallet (RainbowKit) — used for signature
      eligibilityWallet?: string;  // Privy EVM wallet — used for EVM balance check
      solanaWallet?: string;       // Privy embedded Solana wallet — for Solana token holds
      twitterId: string;
      twitterHandle: string;
      platform?: "twitter" | "farcaster";
    };

    if (!twitterId) {
      return NextResponse.json(
        { error: "twitterId required" },
        { status: 400 }
      );
    }

    // Rate limit: 5 attempts per minute per user
    const { allowed } = await rateLimit(
      `eligibility:${twitterId}`,
      5,
      60
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a minute." },
        { status: 429 }
      );
    }

    // Get campaign. Use _count instead of fetching all claim rows — only the
    // claim total is needed for the slots-available check and slot index.
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { _count: { select: { claims: true } } },
    }) as (Campaign & { _count: { claims: number } }) | null;

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (!campaign.isActive) {
      return NextResponse.json({
        eligible: false,
        checks: [],
        reason: "campaign_closed",
      });
    }

    // Check already claimed (against both the claim wallet and the eligibility wallet)
    const orConditions: { twitterId?: string; walletAddress?: string }[] = [{ twitterId }];
    if (walletAddress) orConditions.push({ walletAddress: walletAddress.toLowerCase() });
    if (eligibilityWallet && eligibilityWallet.toLowerCase() !== walletAddress?.toLowerCase())
      orConditions.push({ walletAddress: eligibilityWallet.toLowerCase() });
    const existingClaim = await prisma.claim.findFirst({
      where: { campaignId: params.id, OR: orConditions },
    });

    if (existingClaim) {
      return NextResponse.json({
        eligible: false,
        checks: [],
        reason: "already_claimed",
      });
    }

    // Check if slots available
    const claimedCount = campaign._count.claims;
    if (claimedCount >= campaign.maxRecipients) {
      return NextResponse.json({
        eligible: false,
        checks: [],
        reason: "campaign_full",
      });
    }

    // For Farcaster: fetch the user's verified wallets (EVM + Solana) from Neynar
    //   — EVM for EVM-token holds and as reward recipient, Solana for SPL-token holds.
    // For Twitter: use the Privy-linked wallets sent from the client.
    let balanceWallet = eligibilityWallet || walletAddress || "";
    let solanaBalanceWallet = solanaWallet;
    if (platform === "farcaster" && twitterId) {
      const fc = await getFarcasterWallets(Number(twitterId));
      if (fc.eth) balanceWallet = fc.eth;
      if (fc.sol) solanaBalanceWallet = fc.sol;
    }

    const rules = campaign.eligibilityRules as unknown as EligibilityRule[];
    const hasSocialTasks = rules.some((rule) => rule.type === "social_task");

    // Check cached result. Social task completion can change immediately.
    const cacheKey = `eligibility:${params.id}:${twitterId}:${balanceWallet}:${solanaBalanceWallet}`;
    const cached = hasSocialTasks
      ? null
      : await cacheGet<{
          eligible: boolean;
          checks: unknown[];
        }>(cacheKey);

    let eligibilityResult;
    if (cached) {
      eligibilityResult = cached;
    } else {
      // Evaluate rules — use Privy wallet for token balance check
      // For Farcaster, QRbase API expects FID (e.g. fc:1005896), not username
      const gameStatusHandle = platform === "farcaster" ? twitterId : twitterHandle;
      eligibilityResult = await evaluateEligibility(
        rules,
        gameStatusHandle,
        balanceWallet,
        platform,
        solanaBalanceWallet
      );
      if (!hasSocialTasks) await cacheSet(cacheKey, eligibilityResult, 60);
    }

    if (!eligibilityResult.eligible) {
      return NextResponse.json({
        eligible: false,
        checks: eligibilityResult.checks,
      });
    }

    // Determine reward amount for current slot
    const tiers = campaign.tiers as unknown as RewardTier[];
    const slotIndex = claimedCount;
    let claimAmount: bigint;

    if (tiers.length === 1) {
      claimAmount = BigInt(tiers[0].amount);
    } else {
      claimAmount = BigInt(tiers[slotIndex]?.amount || 0);
    }

    // Eligibility confirmed — signature is fetched separately at claim time via /sign
    return NextResponse.json({
      eligible: true,
      checks: eligibilityResult.checks,
      claimAmount: claimAmount.toString(),
      resolvedRecipient: balanceWallet || undefined,
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    );
  }
}

export const POST = withUsage("/api/campaigns/[id]/eligibility", handler);
