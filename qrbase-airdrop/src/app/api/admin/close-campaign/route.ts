import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseEventLogs } from "viem";
import { getAdminBaseAccount } from "@/lib/cdpWallet";
import { CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI } from "@/lib/contract";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = (await req.json()) as { campaignId: string };
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
    const account = await getAdminBaseAccount();

    const data = encodeFunctionData({
      abi: QRBASE_AIRDROP_ABI,
      functionName: "closeCampaign",
      args: [BigInt(campaign.onChainId)],
    });

    const { transactionHash } = await account.sendTransaction({
      transaction: { to: CONTRACT_ADDRESS, data },
    });

    const receipt = await account.waitForTransactionReceipt({ transactionHash });

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
