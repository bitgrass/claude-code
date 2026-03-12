import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SplitType } from "@prisma/client";

// GET /api/campaigns — List campaigns
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const creator = searchParams.get("creator");
  const activeOnly = searchParams.get("active") !== "false";

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
  });

  // Add computed fields
  const enriched = campaigns.map((c) => ({
    ...c,
    totalAmount: c.totalAmount.toString(),
    claimedCount: c.claims.length,
    remainingAmount: (
      c.totalAmount - c.claims.reduce((sum, cl) => sum + cl.amount, BigInt(0))
    ).toString(),
    claims: c.claims.map((cl) => ({
      ...cl,
      amount: cl.amount.toString(),
    })),
  }));

  return NextResponse.json({ campaigns: enriched });
}

// POST /api/campaigns — Create campaign record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorWallet,
      totalAmount,
      maxRecipients,
      splitType,
      antiBot,
      onChainId,
    } = body;

    if (!creatorWallet || !totalAmount || !maxRecipients || !splitType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        onChainId: onChainId || 0,
        creatorWallet: creatorWallet.toLowerCase(),
        totalAmount: BigInt(totalAmount),
        maxRecipients: parseInt(maxRecipients),
        splitType: splitType as SplitType,
        antiBot: antiBot || {
          minAccountAgeDays: 90,
          minFollowers: 50,
          minFollowing: 5,
          requireVerified: false,
        },
      },
    });

    return NextResponse.json({
      campaign: { ...campaign, totalAmount: campaign.totalAmount.toString() },
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
