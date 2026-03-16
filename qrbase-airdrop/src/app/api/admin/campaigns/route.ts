import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { EligibilityRule, RewardTier } from "@/types";

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
      onChainId: number;
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
        onChainId,
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
