import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getFarcasterUsers } from "@/lib/neynar";
import { resolveClaimIdentity } from "@/lib/claimants";

export const dynamic = "force-dynamic";

// GET /api/campaigns — List campaigns
export async function GET(req: NextRequest) {
  const prisma = getDb();
  const { searchParams } = new URL(req.url);
  const creator = searchParams.get("creator");
  const activeOnly = searchParams.get("active") !== "false";

  try {
    const where: Record<string, unknown> = {};
    if (creator) where.creatorWallet = creator.toLowerCase();
    if (activeOnly) where.isActive = true;

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        _count: { select: { claims: true } },
        claims: {
          orderBy: [{ slotNumber: "desc" }, { claimedAt: "desc" }],
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    }) as (Campaign & { claims: Claim[]; _count: { claims: number } })[];

    const allClaims = campaigns.flatMap((c) => c.claims);
    // Only resolve Farcaster FIDs — Twitter IDs are 17-19 digits (> 1 billion), skip them
    const numericIds = [...new Set(
      allClaims.map((cl) => cl.twitterId)
        .filter((id) => /^\d+$/.test(id) && BigInt(id) < BigInt(1_000_000_000))
        .map(Number)
    )];
    const farcasterUsers = await getFarcasterUsers(numericIds);

    const enriched = campaigns.map((c) => ({
      id: c.id,
      onChainId: c.onChainId,
      name: c.name,
      tokenSymbol: c.tokenSymbol,
      tokenAddress: c.tokenAddress,
      totalUsdc: c.totalUsdc.toString(),
      maxRecipients: c.maxRecipients,
      tiers: c.tiers,
      eligibilityRules: c.eligibilityRules,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      closedAt: c.closedAt?.toISOString() || null,
      claimedCount: c._count.claims,
      claims: c.claims.map((cl) => {
        const identity = resolveClaimIdentity(cl, farcasterUsers);
        return {
          ...cl,
          usdcAmount: cl.usdcAmount.toString(),
          twitterHandle: identity.handle,
          platform: identity.platform,
          avatar: identity.avatar,
        };
      }),
    }));

    return NextResponse.json({ campaigns: enriched }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("List campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
