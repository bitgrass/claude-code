import { NextRequest, NextResponse } from "next/server";
import type { Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getFarcasterUsers } from "@/lib/neynar";
import { resolveClaimIdentity } from "@/lib/claimants";

export const dynamic = "force-dynamic";

// GET /api/campaigns/[id]/winners — Full winner list for a campaign, ordered by most recent
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const claims = await prisma.claim.findMany({
      where: { campaignId: params.id },
      orderBy: { claimedAt: "desc" },
    }) as Claim[];

    // Resolve Farcaster usernames/avatars — filter to FIDs only (< 1B)
    const fids = [
      ...new Set(
        claims
          .map((c) => c.twitterId)
          .filter((id) => /^\d+$/.test(id) && BigInt(id) < BigInt(1_000_000_000))
          .map(Number)
      ),
    ];
    const farcasterUsers = await getFarcasterUsers(fids);

    const winners = claims.map((claim) => {
      const identity = resolveClaimIdentity(claim, farcasterUsers);
      return {
        id: claim.id,
        socialId: claim.twitterId,
        handle: identity.handle,
        platform: identity.platform,
        avatar: identity.avatar,
        amount: identity.amount,
        slotNumber: identity.slotNumber,
        claimedAt: identity.time,
        walletAddress: claim.walletAddress,
        txHash: claim.txHash ?? null,
      };
    });

    return NextResponse.json(
      {
        campaignId: params.id,
        total: winners.length,
        winners,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Get winners error:", error);
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
  }
}
