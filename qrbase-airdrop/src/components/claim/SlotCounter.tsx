"use client";

import type { CampaignStatusResponse } from "@/types";
import { ClaimantAvatar as ClaimantBadge } from "./ClaimantAvatar";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function ClaimantAvatar({ claim }: { claim: CampaignStatusResponse["recentClaims"][0] }) {
  return (
    <ClaimantBadge
      avatar={claim.avatar}
      handle={claim.handle}
      platform={claim.platform}
      size={32}
      badgeSize={14}
    />
  );
}

export function SlotCounter({ status }: { status: CampaignStatusResponse | null }) {
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
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex -space-x-1.5">
            {recentClaims.slice(0, 5).map((claim, i) => (
              <div key={i} style={{ zIndex: 5 - i }}>
                <ClaimantAvatar claim={claim} />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            {recentClaims[0] && (
              <>
                <span className="font-medium text-gray-700">@{recentClaims[0].handle}</span>
                {" "}claimed {formatUsdc(recentClaims[0].amount)} {timeAgo(recentClaims[0].time)}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
