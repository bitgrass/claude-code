import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";

// GET /api/campaigns/[id] — Public campaign info
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        claims: {
          orderBy: { claimedAt: "desc" },
          take: 10,
        },
      },
    }) as (Campaign & { claims: Claim[] }) | null;

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        onChainId: campaign.onChainId,
        name: campaign.name,
        tokenSymbol: campaign.tokenSymbol,
        tokenAddress: campaign.tokenAddress,
        totalUsdc: campaign.totalUsdc.toString(),
        maxRecipients: campaign.maxRecipients,
        tiers: campaign.tiers,
        eligibilityRules: campaign.eligibilityRules,
        isActive: campaign.isActive,
        createdAt: campaign.createdAt.toISOString(),
        closedAt: campaign.closedAt?.toISOString() || null,
        claimedCount: campaign.claims.length,
      },
    });
  } catch (error) {
    console.error("Get campaign error:", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}
