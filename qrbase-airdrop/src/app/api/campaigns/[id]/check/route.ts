import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getTwitterUser } from "@/lib/twitter";
import { checkEligibility } from "@/lib/eligibility";
import { signClaimAuthorization } from "@/lib/signer";
import type { AntiBot } from "@/types";

// POST /api/campaigns/[id]/check — Check eligibility & generate signed claim
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify Twitter session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { walletAddress } = await req.json();
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Get campaign from DB
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { claims: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.isActive) {
      return NextResponse.json({ error: "Campaign is closed" }, { status: 400 });
    }

    if (campaign.claims.length >= campaign.maxRecipients) {
      return NextResponse.json(
        { error: "All reward slots have been claimed" },
        { status: 400 }
      );
    }

    const twitterId = (session.user as { twitterId?: string }).twitterId || "";
    const normalizedWallet = walletAddress.toLowerCase();

    // Check if already claimed
    const existingClaim = await prisma.claim.findFirst({
      where: {
        campaignId: campaign.id,
        OR: [
          { twitterId },
          { walletAddress: normalizedWallet },
        ],
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: "You have already claimed from this campaign" },
        { status: 400 }
      );
    }

    // Check daily claim limit (3 per wallet per 24h across all campaigns)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentClaims = await prisma.claim.count({
      where: {
        walletAddress: normalizedWallet,
        claimedAt: { gte: dayAgo },
      },
    });

    if (recentClaims >= 3) {
      return NextResponse.json(
        {
          eligible: false,
          reason: "Maximum 3 claims per wallet in 24 hours. Please try again later.",
          failedRule: "dailyLimit",
        },
        { status: 200 }
      );
    }

    // Fetch Twitter user data and check eligibility
    const twitterUser = await getTwitterUser(twitterId);
    if (!twitterUser) {
      return NextResponse.json(
        { error: "Could not fetch Twitter profile" },
        { status: 400 }
      );
    }

    const antiBot = campaign.antiBot as AntiBot;
    const eligibility = checkEligibility(twitterUser, antiBot);

    if (!eligibility.eligible) {
      return NextResponse.json(eligibility, { status: 200 });
    }

    // Calculate claim amount
    let claimAmount: bigint;
    const totalClaimed = campaign.claims.reduce(
      (sum, cl) => sum + cl.amount,
      BigInt(0)
    );
    const remaining = campaign.totalAmount - totalClaimed;

    if (campaign.splitType === "EQUAL") {
      claimAmount = campaign.totalAmount / BigInt(campaign.maxRecipients);
    } else {
      // RANDOM: 20%-200% of average share
      const avgShare =
        Number(campaign.totalAmount) / campaign.maxRecipients;
      const min = avgShare * 0.2;
      const max = Math.min(avgShare * 2, Number(remaining));
      const randomAmount = min + Math.random() * (max - min);
      claimAmount = BigInt(Math.floor(randomAmount));
    }

    // Ensure we don't exceed remaining
    if (claimAmount > remaining) {
      claimAmount = remaining;
    }

    // Sign the claim authorization
    const signature = await signClaimAuthorization(
      campaign.onChainId,
      walletAddress,
      twitterId,
      claimAmount
    );

    return NextResponse.json({
      eligible: true,
      authorization: {
        campaignId: campaign.onChainId,
        recipient: walletAddress,
        twitterId,
        amount: claimAmount.toString(),
        signature,
      },
    });
  } catch (error) {
    console.error("Check eligibility error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
