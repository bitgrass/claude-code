import type { Claim } from "@prisma/client";

type FarcasterUser = {
  username: string;
  pfp: string | null;
  xUsername: string | null;
};

type ClaimIdentitySource = Pick<
  Claim,
  "twitterId" | "twitterHandle" | "slotNumber" | "claimedAt" | "usdcAmount"
>;

const EMPTY_HANDLES = new Set(["", "unknown", "null", "undefined", "n/a"]);

// Farcaster FIDs are small integers (< 1B). Twitter IDs are snowflake IDs (10^15+).
// Platform is determined by FID range, not by Neynar resolution success.
function isFarcasterFid(value: string): boolean {
  return /^\d+$/.test(value) && BigInt(value) < BigInt(1_000_000_000);
}


export function normalizeClaimHandle(handle: string | null | undefined): string {
  const normalized = (handle ?? "").trim().replace(/^@+/, "");
  return EMPTY_HANDLES.has(normalized.toLowerCase()) ? "" : normalized;
}

export function getClaimInitials(handle: string): string {
  const normalized = normalizeClaimHandle(handle) || "QR";
  return normalized.slice(0, 2).toUpperCase();
}

export function resolveClaimIdentity(
  claim: ClaimIdentitySource,
  farcasterUsers: Record<number, FarcasterUser>
) {
  const storedHandle = normalizeClaimHandle(claim.twitterHandle);
  // Platform is determined solely by FID range — Neynar only enriches display data
  // (username, avatar). This prevents timing-dependent flicker where a slow/empty
  // Neynar response would incorrectly show a Farcaster claimant as an X user.
  const isFarcaster = isFarcasterFid(claim.twitterId);
  const fid = isFarcaster ? Number(claim.twitterId) : null;
  const farcasterUser = fid !== null ? farcasterUsers[fid] : undefined;

  const handle = isFarcaster
    ? (farcasterUser?.username || storedHandle || claim.twitterId)
    : (storedHandle || claim.twitterId.slice(-6));

  return {
    handle,
    slotNumber: claim.slotNumber,
    amount: claim.usdcAmount.toString(),
    time: claim.claimedAt.toISOString(),
    platform: (isFarcaster ? "farcaster" : "twitter") as
      | "twitter"
      | "farcaster",
    avatar: isFarcaster
      ? (farcasterUser?.pfp ?? null)
      : storedHandle
        ? `https://unavatar.io/twitter/${encodeURIComponent(storedHandle)}?fallback=false`
        : null,
  };
}
