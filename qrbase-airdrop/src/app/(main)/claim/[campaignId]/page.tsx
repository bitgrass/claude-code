"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RecentClaimantsList } from "@/components/claim/RecentClaimantsList";
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

  const claimed = status?.claimedCount ?? campaign?.claimedCount ?? 0;
  const remaining = campaign ? campaign.maxRecipients - claimed : 0;
  const fillPct = campaign ? Math.min(100, (claimed / campaign.maxRecipients) * 100) : 0;

  return (
    <div className="min-h-screen qr-pattern">
      {/* Banner */}
      <div className="gradient-banner py-2.5 px-4 text-center">
        <p className="text-white text-xs font-mono font-medium tracking-wide">
          QRbase Airdrop &mdash; Claim your USDC reward on Base
        </p>
      </div>

      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
          <div className="space-y-5">
            {campaign ? (
              <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mb-1">
                        Active Campaign
                      </p>
                      <h1 className="text-xl font-bold text-gray-900 leading-tight">{campaign.name}</h1>
                    </div>
                    <span className="flex-shrink-0 text-xs font-mono font-semibold bg-primary-light text-primary border border-border px-3 py-1 rounded-full">
                      ${campaign.tokenSymbol}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                  <div className="px-6 py-4 text-center">
                    <p className="text-2xl font-bold font-mono text-gray-900">{formatUsdc(campaign.totalUsdc)}</p>
                    <p className="text-xs text-muted mt-0.5">Prize Pool</p>
                  </div>
                  <div className="px-6 py-4 text-center">
                    <p className="text-2xl font-bold font-mono text-gray-900">{campaign.maxRecipients}</p>
                    <p className="text-xs text-muted mt-0.5">Reward Slots</p>
                  </div>
                </div>

                <div className="px-6 py-4">
                  <div className="flex justify-between text-xs font-mono text-muted mb-1.5">
                    <span>{claimed} claimed</span>
                    <span>{remaining} remaining</span>
                  </div>
                  <div className="h-2 bg-primary-light rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all duration-500"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-border rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-100 rounded w-3/4 mb-3" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-gray-100 rounded-xl" />
                  <div className="h-16 bg-gray-100 rounded-xl" />
                </div>
              </div>
            )}

            {status?.recentClaims && status.recentClaims.length > 0 && (
              <div className="bg-white border border-border rounded-2xl p-5">
                <h3 className="text-xs font-mono font-semibold text-gray-900 uppercase tracking-wider mb-3">
                  Recent Claimants
                </h3>
                <RecentClaimantsList claims={status.recentClaims} dense />
              </div>
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <div className="bg-white border border-border rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <h2 className="text-base font-bold text-gray-900 mb-1">How do you want to claim?</h2>
                <p className="text-xs text-muted">
                  Sign in to verify eligibility. Then connect any wallet to receive your reward.
                </p>
              </div>

              <Button
                size="md"
                className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-sm text-white rounded-lg"
                onClick={() => { window.location.href = `/claim/${campaignId}/twitter`; }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Claim with X (Twitter)
              </Button>

              <Button
                size="md"
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-sm text-white rounded-lg"
                onClick={() => { window.location.href = `/claim/${campaignId}/farcaster`; }}
              >
                <svg className="w-4 h-4" viewBox="0 0 1000 1000" fill="currentColor">
                  <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
                  <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
                  <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
                </svg>
                Claim with Farcaster
              </Button>
            </div>

            <div className="bg-primary-light border border-border rounded-2xl p-5">
              <p className="text-xs font-mono font-semibold text-primary uppercase tracking-wider mb-3">Claim process</p>
              <ol className="space-y-2">
                {[
                  "Sign in with X or Farcaster",
                  "Eligibility verified automatically",
                  "Connect any Base wallet for claiming",
                  "Receive USDC on Base",
                ].map((step, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-primary text-white font-mono font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted pt-8 pb-6 font-mono">
          Powered by{" "}
          <a href="https://qrbase.xyz" className="text-primary hover:underline">
            QRbase
          </a>{" "}
          on Base
        </div>
      </main>
    </div>
  );
}
