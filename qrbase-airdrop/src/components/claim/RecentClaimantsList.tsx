"use client";

import { ClaimantAvatar } from "./ClaimantAvatar";

type ClaimantItem = {
  id?: string;
  handle: string;
  slotNumber: number;
  amount: string;
  avatar: string | null;
  platform: "twitter" | "farcaster";
};

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

export function RecentClaimantsList({
  claims,
  dense = false,
}: {
  claims: ClaimantItem[];
  dense?: boolean;
}) {
  return (
    <div className={dense ? "space-y-2" : "space-y-2.5"}>
      {claims.map((claim, index) => (
        <div
          key={claim.id ?? `${claim.platform}-${claim.slotNumber}-${index}`}
          className={`flex items-center gap-3 rounded-xl border border-border bg-surface-muted ${
            dense ? "px-3 py-2.5" : "px-3.5 py-3"
          }`}
        >
          <ClaimantAvatar
            avatar={claim.avatar}
            handle={claim.handle}
            platform={claim.platform}
            size={dense ? 34 : 40}
            badgeSize={dense ? 20 : 22}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-[0.18em] text-muted">
              #{claim.slotNumber}
            </p>
            <p className="truncate text-sm font-semibold text-gray-900">
              @{claim.handle}
            </p>
          </div>
          <span className="flex-shrink-0 font-mono text-sm font-semibold text-primary">
            {formatUsdc(claim.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
