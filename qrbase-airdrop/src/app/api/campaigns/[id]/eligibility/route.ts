import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import { evaluateEligibility } from "@/lib/eligibility";
import { signClaimAuthorization } from "@/lib/signer";
import { rateLimit, cacheGet, cacheSet } from "@/lib/redis";
import type { EligibilityRule, RewardTier } from "@/types";

// POST /api/campaigns/[id]/eligibility — Check eligibility + sign auth
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const { walletAddress, twitterId, twitterHandle, platform = "twitter" } = await req.json() as {
      walletAddress: string;
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

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { claims: true },
    }) as (Campaign & { claims: Claim[] }) | null;

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

    // Check already claimed
    const orConditions: { twitterId?: string; walletAddress?: string }[] = [{ twitterId }];
    if (walletAddress) orConditions.push({ walletAddress: walletAddress.toLowerCase() });
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
    if (campaign.claims.length >= campaign.maxRecipients) {
      return NextResponse.json({
        eligible: false,
        checks: [],
        reason: "campaign_full",
      });
    }

    // Check cached result
    const cacheKey = `eligibility:${params.id}:${twitterHandle}:${walletAddress}`;
    const cached = await cacheGet<{
      eligible: boolean;
      checks: unknown[];
    }>(cacheKey);

    let eligibilityResult;
    if (cached) {
      eligibilityResult = cached;
    } else {
      // Evaluate rules
      const rules = campaign.eligibilityRules as unknown as EligibilityRule[];
      eligibilityResult = await evaluateEligibility(
        rules,
        twitterHandle,
        walletAddress,
        platform
      );
      await cacheSet(cacheKey, eligibilityResult, 60);
    }

    if (!eligibilityResult.eligible) {
      return NextResponse.json({
        eligible: false,
        checks: eligibilityResult.checks,
      });
    }

    // Determine reward amount for current slot
    const tiers = campaign.tiers as unknown as RewardTier[];
    const slotIndex = campaign.claims.length;
    let claimAmount: bigint;

    if (tiers.length === 1) {
      claimAmount = BigInt(tiers[0].amount);
    } else {
      claimAmount = BigInt(tiers[slotIndex]?.amount || 0);
    }

    // Sign authorization
    const signedAuth = await signClaimAuthorization(
      Number(campaign.onChainId),
      walletAddress,
      twitterId,
      claimAmount
    );

    return NextResponse.json({
      eligible: true,
      checks: eligibilityResult.checks,
      signedAuth,
      claimAmount: claimAmount.toString(),
    });
  } catch (error) {
    console.error("Eligibility check error:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
