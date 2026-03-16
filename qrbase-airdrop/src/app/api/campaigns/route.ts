import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";

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
        claims: {
          orderBy: { claimedAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
    }) as (Campaign & { claims: Claim[] })[];

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
      claimedCount: c.claims.length,
      claims: c.claims.map((cl) => ({
        ...cl,
        usdcAmount: cl.usdcAmount.toString(),
      })),
    }));

    return NextResponse.json({ campaigns: enriched });
  } catch (error) {
    console.error("List campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
