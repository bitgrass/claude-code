"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CampaignScanProgress } from "./CampaignScanProgress";
import type { EligibilityRule } from "@/types";

const SESSION_KEY = "admin_verified";

interface Campaign {
  id: string;
  onChainId: string;
  name: string;
  totalUsdc: string;
  maxRecipients: number;
  claimedCount: number;
  isActive: boolean;
  createdAt: string;
  creatorWallet: string;
  isServerCreated: boolean;
  eligibilityRules: EligibilityRule[] | null;
}

function formatUsdc(amount: string) {
  return `$${(Number(amount) / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AllCampaignsList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        headers: { "x-api-key": localStorage.getItem(SESSION_KEY) ?? "" },
      });
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-muted">No campaigns yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => {
        const progress = Math.round((c.claimedCount / c.maxRecipients) * 100);
        const claimUrl = `https://airdrop.qrbase.xyz/claim/${c.id}`;
        const rules = Array.isArray(c.eligibilityRules) ? c.eligibilityRules as EligibilityRule[] : [];
        const socialTaskRule = rules.find((r) => r.type === "social_task");
        const partnerName = socialTaskRule?.taskId ?? c.name;
        return (
          <div
            key={c.id}
            className="bg-white border border-border rounded-2xl px-5 py-4 space-y-3"
          >
            {/* Top row */}
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isActive ? "bg-green-500" : "bg-gray-300"}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 truncate">{c.name}</span>
                  {c.isServerCreated ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white flex-shrink-0">
                      Server
                    </span>
                  ) : (
                    <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-muted flex-shrink-0">
                      {c.creatorWallet.slice(0, 6)}…{c.creatorWallet.slice(-4)}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-muted"}`}>
                    {c.isActive ? "Active" : "Closed"}
                  </span>
                </div>
                <p className="text-xs text-muted font-mono mt-0.5">
                  #{c.onChainId} · {formatUsdc(c.totalUsdc)} · {c.claimedCount}/{c.maxRecipients} claimed
                </p>
              </div>

              {/* Prize pool */}
              <span className="hidden sm:block text-lg font-bold font-mono text-gray-900 flex-shrink-0">
                {formatUsdc(c.totalUsdc)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{progress}% filled · {c.maxRecipients - c.claimedCount} slots remaining</p>
            </div>

            {/* Claim URL */}
            <div className="flex gap-1.5">
              <input
                type="text"
                readOnly
                value={claimUrl}
                className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-mono text-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(c.id, claimUrl)}
                className="flex-shrink-0 px-3 text-xs"
              >
                {copied === c.id ? "Copied" : "Copy"}
              </Button>
              <a
                href={claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary border border-border rounded-lg hover:bg-surface-muted transition-colors flex-shrink-0"
              >
                Open
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* ScanMode progress + tasks */}
            {partnerName && <CampaignScanProgress partnerName={partnerName} />}
          </div>
        );
      })}
    </div>
  );
}
