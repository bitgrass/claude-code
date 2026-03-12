"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { SplitType } from "@/types";

interface CampaignStatsProps {
  totalAmount: bigint;
  remainingAmount: bigint;
  maxRecipients: number;
  claimedCount: number;
  splitType: SplitType;
  isActive: boolean;
}

function formatUSDC(amount: bigint): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function CampaignStats({
  totalAmount,
  remainingAmount,
  maxRecipients,
  claimedCount,
  splitType,
  isActive,
}: CampaignStatsProps) {
  const slotsRemaining = maxRecipients - claimedCount;
  const progressPercent =
    maxRecipients > 0 ? (claimedCount / maxRecipients) * 100 : 0;

  return (
    <Card variant="highlighted">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Campaign Stats</h3>
        <Badge variant={isActive ? "success" : "error"}>
          {isActive ? "Active" : "Closed"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            Total Pool
          </p>
          <p className="text-2xl font-bold text-white">
            ${formatUSDC(totalAmount)}
          </p>
          <p className="text-xs text-muted">USDC</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            Remaining
          </p>
          <p className="text-2xl font-bold text-accent">
            ${formatUSDC(remainingAmount)}
          </p>
          <p className="text-xs text-muted">USDC</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            Recipients
          </p>
          <p className="text-2xl font-bold text-white">
            {claimedCount}
            <span className="text-muted text-base font-normal">
              /{maxRecipients}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wide">
            Split Type
          </p>
          <p className="text-2xl font-bold text-white">{splitType}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-muted mb-1.5">
          <span>{slotsRemaining} slots remaining</span>
          <span>{Math.round(progressPercent)}% claimed</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-orange rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* No expiry indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>No expiration — open until fully claimed or manually closed</span>
      </div>
    </Card>
  );
}
