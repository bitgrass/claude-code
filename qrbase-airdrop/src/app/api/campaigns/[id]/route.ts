import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/campaigns/[id] — Public campaign info
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      claims: {
        orderBy: { claimedAt: "desc" },
      },
    },
  });

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
}
