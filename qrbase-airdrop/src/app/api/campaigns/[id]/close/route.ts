import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cacheDelete } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";

// POST /api/campaigns/[id]/close — Admin closes campaign in DB
async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        isActive: false,
        closedAt: new Date(),
      },
    });

    await cacheDelete(`status:v2:${params.id}`);

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

export const POST = withUsage("/api/campaigns/[id]/close", handler);
