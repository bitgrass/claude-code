import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { EligibilityRule, RewardTier } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/admin/campaigns — List all campaigns
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cdpWallet = process.env.CDP_WALLET_ADDRESS?.toLowerCase();
  const prisma = getDb();
  const campaigns = await prisma.campaign.findMany({
    where: cdpWallet ? { creatorWallet: cdpWallet } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const claimCounts = await Promise.all(
    campaigns.map((c) => prisma.claim.count({ where: { campaignId: c.id } }))
  );

  return NextResponse.json({
    campaigns: campaigns.map((c, i) => ({
      id: c.id,
      onChainId: c.onChainId,
      name: c.name,
      totalUsdc: c.totalUsdc.toString(),
      maxRecipients: c.maxRecipients,
      claimedCount: claimCounts[i],
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      closedAt: c.closedAt?.toISOString() ?? null,
    })),
  });
}

// POST /api/admin/campaigns — Create campaign on-chain + in DB
export async function POST(req: NextRequest) {
  const prisma = getDb();
  try {
    const body = await req.json();
    const {
      name,
      tokenSymbol,
      tokenAddress,
      totalUsdc,
      maxRecipients,
      tiers,
      eligibilityRules,
      onChainId,
      creatorWallet,
    } = body as {
      name: string;
      tokenSymbol: string;
      tokenAddress: string;
      totalUsdc: string;
      maxRecipients: number;
      tiers: RewardTier[];
      eligibilityRules: EligibilityRule[];
      onChainId: string | number;
      creatorWallet: string;
    };

    const walletAddress = creatorWallet;
    if (!walletAddress) {
      return NextResponse.json(
        { error: "No wallet connected" },
        { status: 400 }
      );
    }

    if (
      !name ||
      !tokenSymbol ||
      !tokenAddress ||
      !totalUsdc ||
      !maxRecipients ||
      !tiers?.length ||
      !eligibilityRules?.length ||
      onChainId === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        onChainId: String(onChainId),
        creatorWallet: walletAddress.toLowerCase(),
        name,
        tokenSymbol,
        tokenAddress,
        totalUsdc: BigInt(totalUsdc),
        maxRecipients,
        tiers: tiers as unknown as Prisma.InputJsonValue,
        eligibilityRules: eligibilityRules as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      campaign: {
        ...campaign,
        totalUsdc: campaign.totalUsdc.toString(),
      },
      claimUrl: `https://airdrop.qrbase.xyz/claim/${campaign.id}`,
    });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
