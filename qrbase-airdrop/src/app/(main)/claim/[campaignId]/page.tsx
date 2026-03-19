"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCampaignStatus } from "@/hooks/useCampaignStatus";
import type { CampaignData } from "@/types";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

export default function ClaimLandingPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const { campaignId } = params;
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { status } = useCampaignStatus(campaignId);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setCampaign(data.campaign))
      .catch(() => setLoadError(true));
  }, [campaignId]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 qr-pattern">
        <Card className="p-8 text-center max-w-md">
          <p className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</p>
          <p className="text-muted">This campaign may have been removed or the URL is incorrect.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen qr-pattern">
      <div className="gradient-banner py-3 px-4 text-center">
        <p className="text-white text-sm font-medium">
          QRbase Airdrop &mdash; Claim your USDC reward on Base
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Campaign info */}
        {campaign ? (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
                <span className="text-sm font-medium text-primary">${campaign.tokenSymbol}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-surface-muted rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-900">{formatUsdc(campaign.totalUsdc)}</p>
                  <p className="text-xs text-muted">Prize Pool</p>
                </div>
                <div className="bg-surface-muted rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-900">{campaign.maxRecipients}</p>
                  <p className="text-xs text-muted">Reward Slots</p>
                </div>
              </div>
              {(() => {
                const claimed = status?.claimedCount ?? campaign.claimedCount ?? 0;
                const remaining = campaign.maxRecipients - claimed;
                return (
                  <div>
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span>{claimed} claimed</span>
                      <span>{remaining} remaining</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full"
                        style={{ width: `${(claimed / campaign.maxRecipients) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>
        ) : (
          <Card className="p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
            </div>
          </Card>
        )}

        {/* Choose your provider */}
        <Card className="p-6 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-1">How do you want to claim?</h2>
            <p className="text-sm text-muted">Choose your identity provider to check eligibility and claim your reward.</p>
          </div>

          <Button
            size="lg"
            className="w-full flex items-center justify-center gap-3"
            onClick={() => { window.location.href = `/claim/${campaignId}/twitter`; }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Claim with X (Twitter)
          </Button>

          <Button
            size="lg"
            className="w-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center gap-3"
            onClick={() => { window.location.href = `/claim/${campaignId}/farcaster`; }}
          >
            <svg className="w-5 h-5" viewBox="0 0 1000 1000" fill="currentColor">
              <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
              <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
              <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
            </svg>
            Claim with Farcaster
          </Button>
        </Card>

        {/* Recent claimants */}
        {status?.recentClaims && status.recentClaims.length > 0 && (
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Claimants</h3>
            <div className="space-y-2">
              {status.recentClaims.map((cl, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono">#{cl.slotNumber}</span>
                    <span className="text-gray-700 font-medium">@{cl.handle}</span>
                  </div>
                  <span className="text-primary font-semibold">{formatUsdc(cl.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="text-center text-xs text-muted pb-8">
          <p>Powered by <a href="https://qrbase.xyz" className="text-primary hover:underline">QRbase</a> on Base</p>
        </div>
      </div>
    </div>
  );
}
