import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/campaigns/[id] — Get single campaign
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

  const totalClaimed = campaign.claims.reduce(
    (sum, cl) => sum + cl.amount,
    BigInt(0)
  );

  return NextResponse.json({
    campaign: {
      ...campaign,
      totalAmount: campaign.totalAmount.toString(),
      claimedCount: campaign.claims.length,
      remainingAmount: (campaign.totalAmount - totalClaimed).toString(),
      claims: campaign.claims.map((cl) => ({
        ...cl,
        amount: cl.amount.toString(),
      })),
    },
  });
}
