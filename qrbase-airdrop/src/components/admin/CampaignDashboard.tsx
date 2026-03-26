"use client";

import { useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ClaimantAvatar } from "@/components/claim/ClaimantAvatar";
import type { CampaignData, ClaimData } from "@/types";

const SESSION_KEY = "admin_verified";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

function ClaimantRow({ claim }: { claim: ClaimData }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-2">
      <ClaimantAvatar
        avatar={claim.avatar ?? null}
        handle={claim.twitterHandle}
        platform={claim.platform ?? "twitter"}
        size={30}
        badgeSize={14}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-muted">
          #{claim.slotNumber}
        </p>
        <p className="truncate text-xs font-semibold text-gray-900">
          @{claim.twitterHandle}
        </p>
      </div>
      <span className="text-xs font-mono font-semibold text-primary">
        {formatUsdc(claim.usdcAmount)}
      </span>
    </div>
  );
}

export function CampaignDashboard() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [campaigns, setCampaigns] = useState<
    (CampaignData & { claims: ClaimData[] })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/campaigns?creator=${address}&active=false`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatured = async () => {
    try {
      const res = await fetch("/api/admin/featured");
      const data = await res.json();
      setFeaturedId(data.campaign?.id || null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchFeatured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleClose = async (campaignId: string) => {
    if (!walletClient) return alert("Connect your wallet first.");
    if (!confirm("Close this campaign and withdraw remaining USDC?")) return;
    setCloseLoading(campaignId);
    try {
      const campaign = campaigns.find((item) => item.id === campaignId);
      if (!campaign) return;

      const { encodeFunctionData } = await import("viem");
      const { QRBASE_AIRDROP_ABI, CONTRACT_ADDRESS } = await import(
        "@/lib/contract"
      );

      const data = encodeFunctionData({
        abi: QRBASE_AIRDROP_ABI,
        functionName: "closeCampaign",
        args: [BigInt(campaign.onChainId)],
      });

      await walletClient.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: CONTRACT_ADDRESS, data }],
      });

      await fetch(`/api/campaigns/${campaignId}/close`, { method: "POST" });
      fetchCampaigns();
    } catch (err) {
      console.error("Failed to close:", err);
    } finally {
      setCloseLoading(null);
    }
  };

  const handleSetFeatured = async (campaignId: string) => {
    const password = localStorage.getItem(SESSION_KEY);
    if (!password) return;
    setFeaturedLoading(campaignId);
    try {
      const isCurrent = featuredId === campaignId;
      await fetch("/api/admin/featured", {
        method: isCurrent ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: isCurrent ? undefined : JSON.stringify({ campaignId }),
      });
      setFeaturedId(isCurrent ? null : campaignId);
    } catch (err) {
      console.error("Failed to set featured:", err);
    } finally {
      setFeaturedLoading(null);
    }
  };

  const handleCopy = (campaignId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(campaignId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((item) => (
          <div key={item} className="h-48 rounded-2xl bg-gray-100" />
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
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Your Campaigns</h2>
      {campaigns.map((campaign) => {
        const claimedCount = campaign.claimedCount || 0;
        const progress = (claimedCount / campaign.maxRecipients) * 100;
        const claimUrl = `https://airdrop.qrbase.xyz/claim/${campaign.id}`;
        const isFeatured = featuredId === campaign.id;

        return (
          <Card
            key={campaign.id}
            className={`overflow-hidden transition-all ${
              isFeatured ? "border-primary ring-1 ring-primary/20" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 pb-3 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate font-semibold text-gray-900">
                  {campaign.name}
                </h3>
                <Badge variant={campaign.isActive ? "success" : "default"}>
                  {campaign.isActive ? "Active" : "Closed"}
                </Badge>
                {isFeatured && (
                  <span className="whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    Featured
                  </span>
                )}
              </div>
              <span className="flex-shrink-0 rounded-full border border-border bg-primary-light px-2.5 py-1 text-xs font-mono font-bold text-primary">
                ${campaign.tokenSymbol}
              </span>
            </div>

            <div className="flex flex-col divide-y divide-border md:flex-row md:divide-x md:divide-y-0">
              <div className="px-5 py-4 md:flex-[1]">
                <p className="mb-3 text-xs font-mono font-semibold uppercase tracking-wider text-muted">
                  Recent Claimants
                </p>
                {campaign.claims.length > 0 ? (
                  <div className="space-y-2">
                    {campaign.claims.slice(0, 5).map((claim) => (
                      <ClaimantRow key={claim.id} claim={claim} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted">No claims yet</p>
                )}
              </div>

              <div className="space-y-4 bg-surface-muted/40 px-5 py-4 md:flex-[2]">
                <div>
                  <p className="mb-0.5 text-xs text-muted">Prize Pool</p>
                  <p className="text-2xl font-bold font-mono text-gray-900">
                    {formatUsdc(campaign.totalUsdc)}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs text-muted">
                    <span>{claimedCount} claimed</span>
                    <span>{campaign.maxRecipients} slots</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {campaign.maxRecipients - claimedCount} remaining
                  </p>
                </div>

                <div>
                  <p className="mb-1.5 text-xs text-muted">Claim URL</p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={claimUrl}
                      className="min-w-0 flex-1 truncate rounded-lg border border-border bg-white px-2 py-1.5 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(campaign.id, claimUrl)}
                      className="flex-shrink-0 px-2.5 text-xs"
                    >
                      {copied === campaign.id ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                {campaign.isActive && (
                  <div className="flex flex-col gap-2 pt-1">
                    <Button
                      variant={isFeatured ? "outline" : "secondary"}
                      size="sm"
                      loading={featuredLoading === campaign.id}
                      onClick={() => handleSetFeatured(campaign.id)}
                      className="w-full text-xs"
                    >
                      {isFeatured ? "Remove from Home" : "Set as Featured"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={closeLoading === campaign.id}
                      onClick={() => handleClose(campaign.id)}
                      className="w-full text-xs"
                    >
                      Close &amp; Withdraw
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
