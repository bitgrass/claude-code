import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { RewardTier } from "@/types";

// GET /api/campaigns/[id]/status — Live slot counter (polled every 10s)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      claims: {
        orderBy: { claimedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  const claimedCount = campaign.claims.length;
  const slotsRemaining = campaign.maxRecipients - claimedCount;
  const tiers = campaign.tiers as RewardTier[];

  let nextRewardAmount: string | null = null;
  if (campaign.isActive && slotsRemaining > 0) {
    if (tiers.length === 1) {
      nextRewardAmount = tiers[0].amount.toString();
    } else if (claimedCount < tiers.length) {
      nextRewardAmount = tiers[claimedCount].amount.toString();
    }
  }

  return NextResponse.json({
    slotsRemaining,
    totalSlots: campaign.maxRecipients,
    claimedCount,
    nextRewardAmount,
    isActive: campaign.isActive,
    recentClaims: campaign.claims.map((cl) => ({
      handle: cl.twitterHandle,
      slotNumber: cl.slotNumber,
      amount: cl.usdcAmount.toString(),
      time: cl.claimedAt.toISOString(),
    })),
  });
}
