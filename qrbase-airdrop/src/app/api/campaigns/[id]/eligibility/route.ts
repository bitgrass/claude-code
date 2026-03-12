import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy";
import { evaluateEligibility } from "@/lib/eligibility";
import { signClaimAuthorization } from "@/lib/signer";
import { rateLimit, cacheGet, cacheSet } from "@/lib/redis";
import type { EligibilityRule, RewardTier } from "@/types";

// POST /api/campaigns/[id]/eligibility — Check eligibility + sign auth
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check
    const user = await verifyPrivyToken(req.headers.get("authorization"));
    if (!user || !user.twitterId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 }
      );
    }

    // Rate limit: 5 attempts per minute per wallet
    const { allowed } = await rateLimit(
      `eligibility:${walletAddress}`,
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
    });

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
    const existingClaim = await prisma.claim.findFirst({
      where: {
        campaignId: params.id,
        OR: [
          { twitterId: user.twitterId },
          { walletAddress: walletAddress.toLowerCase() },
        ],
      },
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
    const cacheKey = `eligibility:${params.id}:${user.twitterId}:${walletAddress}`;
    const cached = await cacheGet<{
      eligible: boolean;
      checks: unknown[];
    }>(cacheKey);

    let eligibilityResult;
    if (cached) {
      eligibilityResult = cached;
    } else {
      // Evaluate rules
      const rules = campaign.eligibilityRules as EligibilityRule[];
      eligibilityResult = await evaluateEligibility(
        rules,
        user.twitterId,
        walletAddress
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
    const tiers = campaign.tiers as RewardTier[];
    const slotIndex = campaign.claims.length;
    let claimAmount: bigint;

    if (tiers.length === 1) {
      claimAmount = BigInt(tiers[0].amount);
    } else {
      claimAmount = BigInt(tiers[slotIndex]?.amount || 0);
    }

    // Sign authorization
    const signedAuth = await signClaimAuthorization(
      campaign.onChainId,
      walletAddress,
      user.twitterId,
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
