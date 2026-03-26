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

function isNumericId(value: string): boolean {
  return /^\d+$/.test(value);
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
  const fid = isNumericId(claim.twitterId) ? Number(claim.twitterId) : null;
  const farcasterUser = fid !== null ? farcasterUsers[fid] : undefined;
  // Strict rule: if Neynar resolves this numeric id to a Farcaster user,
  // always display Farcaster identity.
  const isFarcaster = Boolean(farcasterUser);

  const handle = isFarcaster
    ? farcasterUser!.username
    : storedHandle || claim.twitterId.slice(-6);

  return {
    handle,
    slotNumber: claim.slotNumber,
    amount: claim.usdcAmount.toString(),
    time: claim.claimedAt.toISOString(),
    platform: (isFarcaster ? "farcaster" : "twitter") as
      | "twitter"
      | "farcaster",
    avatar:
      isFarcaster && farcasterUser
        ? farcasterUser.pfp
        : storedHandle
          ? `https://unavatar.io/twitter/${encodeURIComponent(
              storedHandle
            )}?fallback=false`
          : null,
  };
}
