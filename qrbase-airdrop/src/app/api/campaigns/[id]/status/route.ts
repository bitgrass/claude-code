import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { RewardTier } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[id]/status — Live slot counter (polled every 10s)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  const [campaign, claimedCount, recentClaims] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: params.id } }) as Promise<Campaign | null>,
    prisma.claim.count({ where: { campaignId: params.id } }),
    prisma.claim.findMany({
      where: { campaignId: params.id },
      orderBy: { claimedAt: "desc" },
      take: 10,
    }) as Promise<Claim[]>,
  ]);

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  const slotsRemaining = campaign.maxRecipients - claimedCount;
  const tiers = campaign.tiers as unknown as RewardTier[];

  let nextRewardAmount: string | null = null;
  if (campaign.isActive && slotsRemaining > 0) {
    if (tiers.length === 1) {
      nextRewardAmount = tiers[0].amount.toString();
    } else if (claimedCount < tiers.length) {
      nextRewardAmount = tiers[claimedCount].amount.toString();
    }
  }

  return NextResponse.json(
    {
      slotsRemaining,
      totalSlots: campaign.maxRecipients,
      claimedCount,
      nextRewardAmount,
      isActive: campaign.isActive,
      recentClaims: recentClaims.map((cl) => ({
        handle: cl.twitterHandle,
        slotNumber: cl.slotNumber,
        amount: cl.usdcAmount.toString(),
        time: cl.claimedAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
