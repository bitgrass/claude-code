import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/campaigns/[id]/close — Mark campaign as closed in DB
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        totalAmount: campaign.totalAmount.toString(),
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
