import { NextRequest, NextResponse } from "next/server";
import type { Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getFarcasterUsers } from "@/lib/neynar";
import { resolveClaimIdentity } from "@/lib/claimants";
import { cacheGet, cacheSet } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;
const RESPONSE_CACHE_TTL = 30; // seconds

// GET /api/campaigns/[id]/winners — Full winner list for a campaign, ordered by most recent.
// Public endpoint (no internal callers) — cached in Redis and paginated so
// external traffic can't drive unbounded Prisma reads.
async function handler(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = getDb();
  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const skip = Math.max(0, Number(searchParams.get("offset")) || 0);

    const cacheKey = `winners:v1:${params.id}:${take}:${skip}`;
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "no-store", "x-usage-cache": "hit" },
      });
    }

    const [total, claims] = await Promise.all([
      prisma.claim.count({ where: { campaignId: params.id } }),
      prisma.claim.findMany({
        where: { campaignId: params.id },
        orderBy: { claimedAt: "desc" },
        take,
        skip,
      }) as Promise<Claim[]>,
    ]);

    if (total === 0) {
      // Distinguish a missing campaign from one with no claims.
      const exists = await prisma.campaign.findUnique({
        where: { id: params.id },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
    }

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

    const payload = { campaignId: params.id, total, winners };
    await cacheSet(cacheKey, payload, RESPONSE_CACHE_TTL);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store", "x-usage-cache": "miss" },
    });
  } catch (error) {
    console.error("Get winners error:", error);
    return NextResponse.json({ error: "Failed to fetch winners" }, { status: 500 });
  }
}

export const GET = withUsage("/api/campaigns/[id]/winners", handler);
