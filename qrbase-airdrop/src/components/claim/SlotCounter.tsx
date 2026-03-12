"use client";

import type { CampaignStatusResponse } from "@/types";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function SlotCounter({
  status,
}: {
  status: CampaignStatusResponse | null;
}) {
  if (!status) return null;

  const { claimedCount, totalSlots, slotsRemaining, recentClaims } = status;
  const filledBlocks = Math.round((claimedCount / totalSlots) * 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-sm transition-colors ${
                i < filledBlocks ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {claimedCount}/{totalSlots} claimed
        </span>
      </div>

      <p className="text-sm text-muted">
        {slotsRemaining > 0
          ? `${slotsRemaining} slot${slotsRemaining !== 1 ? "s" : ""} remaining`
          : "All slots claimed"}
      </p>

      {recentClaims.length > 0 && (
        <div className="text-xs text-muted space-x-2">
          {recentClaims.slice(0, 3).map((claim, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1">·</span>}
              @{claim.handle} claimed {formatUsdc(claim.amount)}{" "}
              {timeAgo(claim.time)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
