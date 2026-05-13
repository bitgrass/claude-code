import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseEventLogs } from "viem";
import { getAdminBaseAccount } from "@/lib/cdpWallet";

import { CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI, publicClient } from "@/lib/contract";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, skipChain } = (await req.json()) as { campaignId: string; skipChain?: boolean };
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const prisma = getDb();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (!campaign.isActive) {
    return NextResponse.json({ error: "Campaign already closed" }, { status: 400 });
  }

  try {
    // skipChain=true: wallet already executed the on-chain tx, just update DB
    if (skipChain) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { isActive: false, closedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    const account = await getAdminBaseAccount();

    // Read on-chain campaign to verify creator matches current CDP wallet
    const onChain = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: QRBASE_AIRDROP_ABI,
      functionName: "getCampaign",
      args: [BigInt(campaign.onChainId)],
    }) as { creator: `0x${string}`; isActive: boolean };

    if (!onChain.isActive) {
      // Already closed on-chain — just sync the DB
      await prisma.campaign.update({ where: { id: campaignId }, data: { isActive: false, closedAt: new Date() } });
      return NextResponse.json({ ok: true, alreadyClosed: true });
    }

    if (onChain.creator.toLowerCase() !== account.address.toLowerCase()) {
      return NextResponse.json(
        { error: `Creator mismatch — on-chain creator is ${onChain.creator}, current CDP wallet is ${account.address}` },
        { status: 400 }
      );
    }

    const data = encodeFunctionData({
      abi: QRBASE_AIRDROP_ABI,
      functionName: "closeCampaign",
      args: [BigInt(campaign.onChainId)],
    });

    const { userOpHash } = await account.sendUserOperation({
      calls: [{ to: CONTRACT_ADDRESS, data }],
    });

    const userOpResult = await account.waitForUserOperation({ userOpHash });
    if (userOpResult.status !== "complete") throw new Error("UserOperation failed");

    const transactionHash = userOpResult.transactionHash;
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    const logs = parseEventLogs({
      abi: QRBASE_AIRDROP_ABI,
      eventName: "CampaignClosed",
      logs: receipt.logs,
    });

    const remainingAmount = logs.length
      ? (logs[0].args as { remainingAmount: bigint }).remainingAmount
      : BigInt(0);

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { isActive: false, closedAt: new Date() },
    });

    return NextResponse.json({
      txHash: transactionHash,
      remainingUsdc: remainingAmount.toString(),
      withdrawnTo: account.address,
    });
  } catch (err) {
    console.error("close-campaign error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to close campaign" },
      { status: 500 }
    );
  }
}
