import { NextRequest, NextResponse } from "next/server";
import type { Campaign } from "@prisma/client";
import { getDb } from "@/lib/db";
import { cacheDelete } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";
import type { RewardTier } from "@/types";

// POST /api/campaigns/[id]/claim — Record claim after on-chain success
async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const { walletAddress, txHash, twitterId, twitterHandle } = await req.json();

    if (!walletAddress || !txHash || !twitterId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Only the claim count is needed to compute the next slot number.
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

    const slotNumber = campaign._count.claims + 1;
    const tiers = campaign.tiers as unknown as RewardTier[];
    let usdcAmount: bigint;

    if (tiers.length === 1) {
      usdcAmount = BigInt(tiers[0].amount);
    } else {
      usdcAmount = BigInt(tiers[slotNumber - 1]?.amount || 0);
    }

    const claim = await prisma.claim.create({
      data: {
        campaignId: params.id,
        twitterId,
        twitterHandle: twitterHandle || "unknown",
        walletAddress: walletAddress.toLowerCase(),
        usdcAmount,
        slotNumber,
        txHash,
      },
    });

    // Check if campaign is now full
    if (slotNumber >= campaign.maxRecipients) {
      await prisma.campaign.update({
        where: { id: params.id },
        data: { isActive: false, closedAt: new Date() },
      });
    }

    // Invalidate the cached status response so the post-claim refetch is fresh.
    await cacheDelete(`status:v2:${params.id}`);

    return NextResponse.json({
      claim: {
        ...claim,
        usdcAmount: claim.usdcAmount.toString(),
      },
      slotsRemaining: campaign.maxRecipients - slotNumber,
    });
  } catch (error) {
    console.error("Record claim error:", error);
    return NextResponse.json(
      { error: "Failed to record claim" },
      { status: 500 }
    );
  }
}

export const POST = withUsage("/api/campaigns/[id]/claim", handler);
