import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";

// POST /api/campaigns/[id]/claim — Record claim in DB after on-chain confirmation
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { walletAddress, twitterId, amount, txHash } = await req.json();

    if (!walletAddress || !twitterId || !amount || !txHash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const twitterHandle = (session.user as { username?: string }).username ||
      session.user.name || "unknown";

    const claim = await prisma.claim.create({
      data: {
        campaignId: params.id,
        twitterId,
        twitterHandle,
        walletAddress: walletAddress.toLowerCase(),
        amount: BigInt(amount),
        txHash,
      },
    });

    return NextResponse.json({
      claim: { ...claim, amount: claim.amount.toString() },
    });
  } catch (error) {
    console.error("Record claim error:", error);
    return NextResponse.json(
      { error: "Failed to record claim" },
      { status: 500 }
    );
  }
}
