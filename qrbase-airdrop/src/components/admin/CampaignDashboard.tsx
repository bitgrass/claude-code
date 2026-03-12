"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { CampaignData, ClaimData } from "@/types";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

export function CampaignDashboard() {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const [campaigns, setCampaigns] = useState<
    (CampaignData & { claims: ClaimData[] })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    if (!wallet) return;
    try {
      const res = await fetch(
        `/api/campaigns?creator=${wallet.address}&active=false`
      );
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  const handleClose = async (campaignId: string) => {
    if (!confirm("Close this campaign and withdraw remaining USDC?")) return;
    try {
      const token = await getAccessToken();
      await fetch(`/api/campaigns/${campaignId}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to close:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted">No campaigns yet. Create your first one above.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Your Campaigns</h2>
      {campaigns.map((campaign) => {
        const claimedCount = campaign.claimedCount || 0;
        const filledBlocks = Math.round(
          (claimedCount / campaign.maxRecipients) * 10
        );
        const claimUrl = `https://airdrop.qrbase.xyz/claim/${campaign.id}`;

        return (
          <Card key={campaign.id} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
              <Badge variant={campaign.isActive ? "success" : "default"}>
                {campaign.isActive ? "Active" : "Closed"}
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-sm ${
                      i < filledBlocks ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted whitespace-nowrap">
                {claimedCount}/{campaign.maxRecipients}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted">Prize Pool</span>
                <p className="font-medium">
                  {formatUsdc(campaign.totalUsdc)}
                </p>
              </div>
              <div>
                <span className="text-muted">Token</span>
                <p className="font-medium">${campaign.tokenSymbol}</p>
              </div>
            </div>

            {/* Claim URL */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={claimUrl}
                className="flex-1 px-3 py-1.5 bg-surface-muted border border-border rounded-lg text-xs font-mono"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(claimUrl)}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted">
              Add this URL to qrfy.com to generate your QR code
            </p>

            {/* Recent claims */}
            {campaign.claims && campaign.claims.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">
                  Recent Claims
                </p>
                {campaign.claims.slice(0, 5).map((claim: ClaimData) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between text-xs bg-surface-muted p-2 rounded-lg"
                  >
                    <span className="text-gray-600">
                      @{claim.twitterHandle}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatUsdc(claim.usdcAmount)}
                      </span>
                      {claim.txHash && (
                        <a
                          href={`https://basescan.org/tx/${claim.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          tx
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {campaign.isActive && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleClose(campaign.id)}
              >
                Close Campaign &amp; Withdraw
              </Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}
