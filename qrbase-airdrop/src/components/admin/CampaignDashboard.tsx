"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI } from "@/lib/contract";
import type { CampaignData, ClaimData } from "@/types";

function formatUSDC(amount: bigint | string): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CampaignDashboard() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [campaigns, setCampaigns] = useState<(CampaignData & { claims: ClaimData[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    fetchCampaigns();
  }, [address]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/campaigns?creator=${address}`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      console.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (campaign: CampaignData) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: QRBASE_AIRDROP_ABI,
      functionName: "closeCampaign",
      args: [BigInt(campaign.onChainId)],
    });

    // Also update DB
    fetch(`/api/campaigns/${campaign.id}/close`, { method: "POST" }).then(() =>
      fetchCampaigns()
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-muted">No campaigns yet. Create your first one above!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {campaigns.map((campaign) => {
        const progressPercent =
          campaign.maxRecipients > 0
            ? (campaign.claimedCount / campaign.maxRecipients) * 100
            : 0;

        return (
          <Card key={campaign.id}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white">
                    Campaign #{campaign.onChainId}
                  </h4>
                  <Badge variant={campaign.isActive ? "success" : "error"}>
                    {campaign.isActive ? "Active" : "Closed"}
                  </Badge>
                  <Badge variant="warning">{campaign.splitType}</Badge>
                </div>
                <p className="text-xs text-muted">
                  Created {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
              {campaign.isActive && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={isPending}
                  onClick={() => handleClose(campaign)}
                >
                  Close & Withdraw
                </Button>
              )}
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted">
                  ${formatUSDC(campaign.totalAmount)} pool
                </span>
                <span className="text-white">
                  {campaign.claimedCount}/{campaign.maxRecipients} claimed
                </span>
              </div>
              <div className="h-2 bg-surface-light rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent-orange rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Recent claims */}
            {campaign.claims && campaign.claims.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Recent Claims
                </h5>
                <div className="space-y-2">
                  {campaign.claims.slice(0, 5).map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-accent">@{claim.twitterHandle}</span>
                        <span className="text-muted">
                          {truncateAddress(claim.walletAddress)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-success font-medium">
                          +${formatUSDC(claim.amount.toString())}
                        </span>
                        <span className="text-muted text-xs">
                          {timeAgo(claim.claimedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
