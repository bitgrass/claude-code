"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CampaignStats } from "@/components/campaign/CampaignStats";
import { ClaimFlow } from "@/components/campaign/ClaimFlow";
import type { CampaignData, SplitType } from "@/types";

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Campaign not found");
        return res.json();
      })
      .then((data) => setCampaign(data.campaign))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-error text-lg font-semibold mb-2">
            Campaign Not Found
          </p>
          <p className="text-muted text-sm mb-4">{error}</p>
          <Link
            href="/"
            className="text-accent hover:underline text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const totalAmount = BigInt(campaign.totalAmount);
  const remainingAmount = BigInt(campaign.remainingAmount);
  const equalShare = campaign.splitType === "EQUAL"
    ? totalAmount / BigInt(campaign.maxRecipients)
    : BigInt(0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">QR</span>
            </div>
            <span className="font-bold text-lg text-white">
              QRbase <span className="text-accent">Airdrop</span>
            </span>
          </Link>
          <span className="text-muted text-sm">
            Campaign #{campaign.onChainId}
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        <CampaignStats
          totalAmount={totalAmount}
          remainingAmount={remainingAmount}
          maxRecipients={campaign.maxRecipients}
          claimedCount={campaign.claimedCount}
          splitType={campaign.splitType as SplitType}
          isActive={campaign.isActive}
        />

        <ClaimFlow
          campaignId={campaignId}
          onChainId={campaign.onChainId}
          splitType={campaign.splitType as SplitType}
          equalShare={equalShare}
          totalAmount={totalAmount}
          maxRecipients={campaign.maxRecipients}
          isActive={campaign.isActive}
        />
      </div>
    </div>
  );
}
