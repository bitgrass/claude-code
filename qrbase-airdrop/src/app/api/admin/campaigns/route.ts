import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAdminBaseAccount } from "@/lib/cdpWallet";
import { getDb } from "@/lib/db";
import type { EligibilityRule, RewardTier } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/admin/campaigns — List all campaigns
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let cdpWallet: string | undefined;
  try {
    const account = await getAdminBaseAccount();
    cdpWallet = account.address.toLowerCase();
  } catch {
    cdpWallet = process.env.CDP_WALLET_ADDRESS?.toLowerCase();
  }
  const prisma = getDb();
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
  });

  const claimCounts = await Promise.all(
    campaigns.map((c) => prisma.claim.count({ where: { campaignId: c.id } }))
  );

  const withMeta = campaigns.map((c, i) => ({
    id: c.id,
    onChainId: c.onChainId,
    name: c.name,
    totalUsdc: c.totalUsdc.toString(),
    maxRecipients: c.maxRecipients,
    claimedCount: claimCounts[i],
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
    creatorWallet: c.creatorWallet,
    isServerCreated: cdpWallet ? c.creatorWallet === cdpWallet : false,
    eligibilityRules: c.eligibilityRules,
  }));

  // Server-created campaigns appear first
  const sorted = [
    ...withMeta.filter((c) => c.isServerCreated),
    ...withMeta.filter((c) => !c.isServerCreated),
  ];

  return NextResponse.json({ campaigns: sorted });
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
