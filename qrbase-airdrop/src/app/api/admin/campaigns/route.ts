import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAdminBaseAccount } from "@/lib/cdpWallet";
import { getDb } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";
import { withUsage } from "@/lib/usage/track";
import type { EligibilityRule, RewardTier } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/admin/campaigns — List all campaigns
async function listCampaigns(req: NextRequest) {
  if (!isAdminRequest(req)) {
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
    select: {
      id: true,
      onChainId: true,
      name: true,
      totalUsdc: true,
      maxRecipients: true,
      isActive: true,
      createdAt: true,
      closedAt: true,
      creatorWallet: true,
      eligibilityRules: true,
    },
  });

  // Single grouped count instead of one count query per campaign (was N+1).
  const grouped = (await prisma.claim.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaigns.map((c) => c.id) } },
    _count: { _all: true },
  })) as Array<{ campaignId: string; _count: { _all: number } }>;
  const countByCampaign = new Map<string, number>(
    grouped.map((g) => [g.campaignId, g._count._all])
  );

  const withMeta = campaigns.map((c) => ({
    id: c.id,
    onChainId: c.onChainId,
    name: c.name,
    totalUsdc: c.totalUsdc.toString(),
    maxRecipients: c.maxRecipients,
    claimedCount: countByCampaign.get(c.id) ?? 0,
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

export const GET = withUsage("/api/admin/campaigns", listCampaigns);

// POST /api/admin/campaigns — Create campaign on-chain + in DB
async function createCampaign(req: NextRequest) {
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

export const POST = withUsage("/api/admin/campaigns", createCampaign);
