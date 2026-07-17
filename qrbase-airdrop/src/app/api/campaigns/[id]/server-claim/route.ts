import { NextRequest, NextResponse } from "next/server";
import type { Campaign } from "@prisma/client";
import { getDb } from "@/lib/db";
import { signClaimAuthorization } from "@/lib/signer";
import { getRelayerWalletClient, publicClient, CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI } from "@/lib/contract";
import { getFarcasterWallets } from "@/lib/neynar";
import { evaluateEligibility } from "@/lib/eligibility";
import { rateLimit, cacheDelete } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";
import type { EligibilityRule, RewardTier } from "@/types";

export const dynamic = "force-dynamic";

async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const {
      twitterId,
      twitterHandle,
      recipientWallet,  // user's Privy-linked wallet
      solanaWallet = "", // Privy embedded Solana wallet (Twitter path)
      platform = "twitter",
    } = await req.json() as {
      twitterId: string;
      twitterHandle: string;
      recipientWallet: string;
      solanaWallet?: string;
      platform?: "twitter" | "farcaster";
    };

    if (!twitterId || !recipientWallet) {
      return NextResponse.json({ error: "twitterId and recipientWallet required" }, { status: 400 });
    }

    // Rate limit
    const { allowed } = await rateLimit(`server-claim:${twitterId}`, 3, 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
    }

    // Load campaign — only the claim count is needed (slot index + full check);
    // the already-claimed check below is a separate targeted query.
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: { _count: { select: { claims: true } } },
    }) as (Campaign & { _count: { claims: number } }) | null;

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!campaign.isActive) return NextResponse.json({ error: "campaign_closed" }, { status: 400 });
    const claimedCount = campaign._count.claims;
    if (claimedCount >= campaign.maxRecipients) {
      return NextResponse.json({ error: "campaign_full" }, { status: 400 });
    }

    // Resolve actual recipient before the already_claimed check.
    // For Farcaster: use the Neynar verified wallets — EVM as recipient + EVM
    // balance wallet, Solana for SPL-token holds.
    let recipient = recipientWallet;
    let balanceWallet = recipientWallet;
    let solanaBalanceWallet = solanaWallet;
    if (platform === "farcaster") {
      const fc = await getFarcasterWallets(Number(twitterId));
      if (fc.eth) {
        recipient = fc.eth;
        balanceWallet = fc.eth;
      }
      if (fc.sol) solanaBalanceWallet = fc.sol;
    }

    // Check already claimed
    const orConditions: { twitterId?: string; walletAddress?: string }[] = [{ twitterId }];
    if (recipient) orConditions.push({ walletAddress: recipient.toLowerCase() });
    if (recipientWallet && recipientWallet.toLowerCase() !== recipient.toLowerCase())
      orConditions.push({ walletAddress: recipientWallet.toLowerCase() });
    const existing = await prisma.claim.findFirst({
      where: { campaignId: params.id, OR: orConditions },
    });
    if (existing) return NextResponse.json({ error: "already_claimed" }, { status: 400 });

    // Re-verify eligibility server-side (fresh, no cache)
    const rules = campaign.eligibilityRules as unknown as EligibilityRule[];
    const gameHandle = platform === "farcaster" ? twitterId : twitterHandle;
    const { eligible, checks } = await evaluateEligibility(rules, gameHandle, balanceWallet, platform, solanaBalanceWallet);

    if (!eligible) {
      return NextResponse.json({ eligible: false, checks }, { status: 403 });
    }

    // The reward is USDC on Base — the recipient MUST be a valid EVM address.
    // (Solana wallets are used only for the eligibility balance check, never here.)
    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return NextResponse.json(
        { error: "No EVM wallet found to receive the USDC reward. Please link an Ethereum wallet to your account." },
        { status: 400 }
      );
    }

    // Calculate reward amount
    const tiers = campaign.tiers as unknown as RewardTier[];
    const slotIndex = claimedCount;
    const claimAmount = BigInt(
      tiers.length === 1 ? tiers[0].amount : (tiers[slotIndex]?.amount || 0)
    );

    // Sign authorization — same format as existing signer
    const signature = await signClaimAuthorization(
      Number(campaign.onChainId),
      recipient,
      twitterId,
      claimAmount
    );

    // Relayer wallet calls distributeReward on contract
    const walletClient = getRelayerWalletClient();
    const txHash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: QRBASE_AIRDROP_ABI,
      functionName: "distributeReward",
      args: [BigInt(campaign.onChainId), recipient as `0x${string}`, twitterId, signature as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    // Record in DB
    const slotNumber = slotIndex + 1;
    await prisma.claim.create({
      data: {
        campaignId: params.id,
        twitterId,
        twitterHandle: twitterHandle || "unknown",
        walletAddress: recipient.toLowerCase(),
        usdcAmount: claimAmount,
        slotNumber,
        txHash,
      },
    });

    if (slotNumber >= campaign.maxRecipients) {
      await prisma.campaign.update({
        where: { id: params.id },
        data: { isActive: false, closedAt: new Date() },
      });
    }

    // Invalidate cached status so slot count/recent claimants refresh promptly.
    await cacheDelete(`status:v2:${params.id}`);

    return NextResponse.json({ txHash, claimAmount: claimAmount.toString(), recipientAddress: recipient });
  } catch (error) {
    console.error("server-claim error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process claim" },
      { status: 500 }
    );
  }
}

export const POST = withUsage("/api/campaigns/[id]/server-claim", handler);
