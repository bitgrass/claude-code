import { NextRequest, NextResponse } from "next/server";
import type { Campaign, Claim } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { RewardTier } from "@/types";
import { getFarcasterUsers } from "@/lib/neynar";
import { resolveClaimIdentity } from "@/lib/claimants";
import { cacheGet, cacheSet } from "@/lib/redis";
import { withUsage } from "@/lib/usage/track";

export const dynamic = "force-dynamic";

// This endpoint is polled by every open claim page, so it is the single biggest
// source of Prisma Accelerate operations. Two optimisations:
//   1. One query instead of three — campaign + claim count + recent claims are
//      fetched in a single findUnique using `_count` and a `claims` relation.
//   2. A short Redis response cache (RESPONSE_CACHE_TTL) so that many viewers
//      polling the same campaign collapse onto one Prisma query per window —
//      cache hits cost zero Accelerate operations.
// 60s so that repeated polls of the same campaign collapse onto ~1 Prisma
// query per minute regardless of how aggressively it is polled (a lone poller
// at ~30s missed the old 15s cache every time). Safe because the cache is
// explicitly invalidated whenever a claim is recorded or a campaign is closed.
const RESPONSE_CACHE_TTL = 60; // seconds

async function handler(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cacheKey = `status:v2:${params.id}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "no-store", "x-usage-cache": "hit" },
    });
  }

  const prisma = getDb();
  const campaign = (await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { claims: true } },
      claims: {
        orderBy: [{ slotNumber: "desc" }, { claimedAt: "desc" }],
        take: 10,
        select: {
          twitterId: true,
          twitterHandle: true,
          slotNumber: true,
          claimedAt: true,
          usdcAmount: true,
        },
      },
    },
  })) as
    | (Campaign & {
        _count: { claims: number };
        claims: Pick<
          Claim,
          "twitterId" | "twitterHandle" | "slotNumber" | "claimedAt" | "usdcAmount"
        >[];
      })
    | null;

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const claimedCount = campaign._count.claims;
  const recentClaims = campaign.claims;
  const slotsRemaining = campaign.maxRecipients - claimedCount;
  const tiers = campaign.tiers as unknown as RewardTier[];

  let nextRewardAmount: string | null = null;
  if (campaign.isActive && slotsRemaining > 0) {
    if (tiers.length === 1) {
      nextRewardAmount = tiers[0].amount.toString();
    } else if (claimedCount < tiers.length) {
      nextRewardAmount = tiers[claimedCount].amount.toString();
    }
  }

  // Only resolve Farcaster FIDs — Twitter IDs are 17-19 digits (> 1 billion), skip them
  const numericIds = recentClaims
    .map((cl) => cl.twitterId)
    .filter((id) => /^\d+$/.test(id) && BigInt(id) < BigInt(1_000_000_000))
    .map(Number);
  const farcasterUsers = await getFarcasterUsers([...new Set(numericIds)]);

  const enrichedClaims = recentClaims.map((cl) =>
    resolveClaimIdentity(cl, farcasterUsers)
  );

  const payload = {
    slotsRemaining,
    totalSlots: campaign.maxRecipients,
    claimedCount,
    nextRewardAmount,
    isActive: campaign.isActive,
    recentClaims: enrichedClaims,
  };

  // Short-lived cache so polling traffic doesn't re-run this query for every
  // viewer. Public, non-sensitive data — safe to share across users.
  await cacheSet(cacheKey, payload, RESPONSE_CACHE_TTL);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store", "x-usage-cache": "miss" },
  });
}

export const GET = withUsage("/api/campaigns/[id]/status", handler);
