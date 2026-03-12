import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy";

// POST /api/campaigns/[id]/close — Admin closes campaign in DB
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyPrivyToken(req.headers.get("authorization"));
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (
      campaign.creatorWallet.toLowerCase() !==
      user.walletAddress?.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Only the creator can close this campaign" },
        { status: 403 }
      );
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      campaign: {
        ...updated,
        totalUsdc: updated.totalUsdc.toString(),
      },
    });
  } catch (error) {
    console.error("Close campaign error:", error);
    return NextResponse.json(
      { error: "Failed to close campaign" },
      { status: 500 }
    );
  }
}
