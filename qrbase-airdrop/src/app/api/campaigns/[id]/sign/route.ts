import { NextRequest, NextResponse } from "next/server";
import type { Campaign } from "@prisma/client";
import { getDb } from "@/lib/db";
import { signClaimAuthorization } from "@/lib/signer";
import { withUsage } from "@/lib/usage/track";
import type { RewardTier } from "@/types";

// POST /api/campaigns/[id]/sign — Sign claim authorization (eligibility already verified)
async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const { walletAddress, twitterId } = await req.json() as {
      walletAddress: string;
      twitterId: string;
    };

    if (!walletAddress || !twitterId) {
      return NextResponse.json(
        { error: "walletAddress and twitterId required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { _count: { select: { claims: true } } },
    }) as (Campaign & { _count: { claims: number } }) | null;

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.isActive) {
      return NextResponse.json({ error: "campaign_closed" }, { status: 400 });
    }

    const claimedCount = campaign._count.claims;
    if (claimedCount >= campaign.maxRecipients) {
      return NextResponse.json({ error: "campaign_full" }, { status: 400 });
    }

    // Check not already claimed
    const existing = await prisma.claim.findFirst({
      where: {
        campaignId: params.id,
        OR: [{ twitterId }, { walletAddress: walletAddress.toLowerCase() }],
      },
    });
    if (existing) {
      return NextResponse.json({ error: "already_claimed" }, { status: 400 });
    }

    // Calculate reward for current slot
    const tiers = campaign.tiers as unknown as RewardTier[];
    const slotIndex = claimedCount;
    const claimAmount = BigInt(
      tiers.length === 1 ? tiers[0].amount : (tiers[slotIndex]?.amount || 0)
    );

    const signedAuth = await signClaimAuthorization(
      Number(campaign.onChainId),
      walletAddress,
      twitterId,
      claimAmount
    );

    return NextResponse.json({ signedAuth, claimAmount: claimAmount.toString() });
  } catch (error) {
    console.error("Sign error:", error);
    return NextResponse.json({ error: "Failed to sign authorization" }, { status: 500 });
  }
}

export const POST = withUsage("/api/campaigns/[id]/sign", handler);
