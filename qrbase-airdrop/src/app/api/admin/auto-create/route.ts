import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData, parseEventLogs } from "viem";
import type { Prisma } from "@prisma/client";
import { getAdminBaseAccount, getCdpWalletDiagnostics } from "@/lib/cdpWallet";
import { publicClient, CONTRACT_ADDRESS, USDC_ADDRESS, QRBASE_AIRDROP_ABI, ERC20_ABI } from "@/lib/contract";
import { getDb } from "@/lib/db";
import type { EligibilityRule, RewardTier } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // --- Auth ---
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    name: string;
    totalUsdc: number;
    maxRecipients: number;
    minPuzzleWins?: number;
    minScanBalance?: number;           // SCAN token balance rule (always added if > 0)
    partnerTokenAddress?: string;      // partner's own token CA
    partnerTokenSymbol?: string;       // partner's token display symbol
    partnerTokenMin?: number;          // min balance of partner token
  };

  const {
    name, totalUsdc, maxRecipients,
    minPuzzleWins = 0,
    minScanBalance = 0,
    partnerTokenAddress,
    partnerTokenSymbol,
    partnerTokenMin = 0,
  } = body;

  if (!name || !totalUsdc || !maxRecipients) {
    return NextResponse.json(
      { error: "name, totalUsdc, maxRecipients are required" },
      { status: 400 }
    );
  }

  const totalUsdcRaw = BigInt(Math.round(totalUsdc * 1e6));
  const slots = Math.floor(maxRecipients);
  const perSlot = totalUsdcRaw / BigInt(slots);

  try {
    const account = await getAdminBaseAccount();
    const adminAddress = account.address;

    // --- Step 1: Approve USDC spend ---
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, totalUsdcRaw],
    });

    const { transactionHash: approveTxHash } = await account.sendTransaction({
      transaction: { to: USDC_ADDRESS, data: approveData },
    });
    await account.waitForTransactionReceipt({ transactionHash: approveTxHash });

    // --- Step 2: Create campaign on-chain ---
    const createData = encodeFunctionData({
      abi: QRBASE_AIRDROP_ABI,
      functionName: "createCampaign",
      args: [totalUsdcRaw, BigInt(slots), [perSlot]],
    });

    const { transactionHash: createTxHash } = await account.sendTransaction({
      transaction: { to: CONTRACT_ADDRESS, data: createData },
    });
    const receipt = await account.waitForTransactionReceipt({
      transactionHash: createTxHash,
    });

    // --- Step 3: Extract onChainId from CampaignCreated event ---
    const logs = parseEventLogs({
      abi: QRBASE_AIRDROP_ABI,
      eventName: "CampaignCreated",
      logs: receipt.logs,
    });
    if (!logs.length) throw new Error("CampaignCreated event not found in receipt");
    const onChainId = (logs[0].args as { campaignId: bigint }).campaignId.toString();

    // --- Step 4: Save to DB ---
    const prisma = getDb();

    const tiers: RewardTier[] = [{ position: 1, amount: Number(perSlot) }];

    const scanAddress = process.env.NEXT_PUBLIC_SCAN_TOKEN_ADDRESS || "";
    const eligibilityRules: EligibilityRule[] = [
      // SCAN rule — always present
      { type: "token_balance" as const, token: "SCAN", tokenAddress: scanAddress, min: minScanBalance },
      // Puzzle wins — optional
      ...(minPuzzleWins > 0
        ? [{ type: "puzzle_wins" as const, token: "SCAN", min: minPuzzleWins }]
        : []),
      // Partner token — optional, uses their CA
      ...(partnerTokenAddress && partnerTokenMin > 0
        ? [{
            type: "token_balance" as const,
            token: partnerTokenSymbol || "TOKEN",
            tokenAddress: partnerTokenAddress,
            min: partnerTokenMin,
          }]
        : []),
    ];

    const campaign = await prisma.campaign.create({
      data: {
        onChainId,
        creatorWallet: adminAddress.toLowerCase(),
        name,
        tokenSymbol: "SCAN",
        tokenAddress: scanAddress,
        totalUsdc: totalUsdcRaw,
        maxRecipients: slots,
        tiers: tiers as unknown as Prisma.InputJsonValue,
        eligibilityRules: eligibilityRules as unknown as Prisma.InputJsonValue,
      },
    });

    const claimUrl = `https://airdrop.qrbase.xyz/claim/${campaign.id}`;

    return NextResponse.json({
      claimUrl,
      campaignId: campaign.id,
      onChainId,
      adminWallet: adminAddress,
      approveTx: approveTxHash,
      createTx: createTxHash,
    });
  } catch (err) {
    console.error("auto-create error:", err);

    const cdpError = err as {
      statusCode?: number;
      errorType?: string;
      errorMessage?: string;
      correlationId?: string;
      errorLink?: string;
      message?: string;
    };

    const isWalletAuthError =
      cdpError.statusCode === 401 || cdpError.errorType === "unauthorized";

    if (isWalletAuthError) {
      return NextResponse.json(
        {
          error: cdpError.errorMessage || "Wallet authentication error.",
          hint: "Check CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY, CDP_WALLET_SECRET, and CDP_WALLET_NAME.",
          correlationId: cdpError.correlationId || null,
          errorLink: cdpError.errorLink || null,
          diagnostics: getCdpWalletDiagnostics(),
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error:
          cdpError.errorMessage ||
          cdpError.message ||
          "Failed to create campaign",
      },
      { status: 500 }
    );
  }
}
