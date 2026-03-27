import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { RewardTier } from "@/types";
import { getFarcasterUsers } from "@/lib/neynar";
import { resolveClaimIdentity } from "@/lib/claimants";

export const dynamic = "force-dynamic";

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
      orderBy: [{ slotNumber: "desc" }, { claimedAt: "desc" }],
      take: 10,
    }) as Promise<Claim[]>,
  ]);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
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

  // Only resolve Farcaster FIDs — Twitter IDs are 17-19 digits (> 1 billion), skip them
  const numericIds = recentClaims
    .map((cl) => cl.twitterId)
    .filter((id) => /^\d+$/.test(id) && BigInt(id) < BigInt(1_000_000_000))
    .map(Number);
  const farcasterUsers = await getFarcasterUsers([...new Set(numericIds)]);

  const enrichedClaims = recentClaims.map((cl) =>
    resolveClaimIdentity(cl, farcasterUsers)
  );

  return NextResponse.json(
    {
      slotsRemaining,
      totalSlots: campaign.maxRecipients,
      claimedCount,
      nextRewardAmount,
      isActive: campaign.isActive,
      recentClaims: enrichedClaims,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
