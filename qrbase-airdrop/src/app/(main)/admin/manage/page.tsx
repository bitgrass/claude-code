"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { CampaignScanProgress } from "@/components/admin/CampaignScanProgress";
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

export default function ManagePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<{ txHash: string; remainingUsdc: string } | null>(null);

  const apiKey = () => localStorage.getItem(SESSION_KEY) ?? "";

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        headers: { "x-api-key": apiKey() },
      });
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
    loadCampaigns();
  }, [router, loadCampaigns]);

  const handleClose = async (campaignId: string) => {
    setClosingId(campaignId);
    setCloseError(null);
    setCloseResult(null);
    try {
      const res = await fetch("/api/admin/close-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey() },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close");
      setCloseResult({ txHash: data.txHash, remainingUsdc: data.remainingUsdc });
      loadCampaigns();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setClosingId(null);
    }
  };

  if (!ready) return null;

  const fmt = (n: number) => `$${(n / 1e6).toFixed(2)}`;
  const activeCount = campaigns.filter((c) => c.isActive).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="QRbase" className="h-6 w-auto" />
              <span className="font-bold text-sm text-gray-900">
                QRbase <span className="text-primary">Manage</span>
              </span>
            </div>
          </div>
          <Link
            href="/admin/quick-create"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark border border-primary rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Create
          </Link>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Campaigns</h1>
            <p className="text-sm text-muted mt-1">
              Close a campaign to stop new claims and withdraw remaining USDC back to the CDP wallet.
            </p>
          </div>
          {!loading && campaigns.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono flex-shrink-0">
              <span className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {activeCount} active
              </span>
              <span className="flex items-center gap-1.5 text-muted bg-surface-muted border border-border rounded-lg px-3 py-1.5">
                {campaigns.length - activeCount} closed
              </span>
            </div>
          )}
        </div>

        {/* Feedback banners */}
        {closeError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
            {closeError}
          </div>
        )}
        {closeResult && (
          <div className="mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 space-y-1">
            <p className="font-semibold">Campaign closed — remaining USDC withdrawn to CDP wallet.</p>
            <p className="font-mono text-xs">
              Returned: {fmt(Number(closeResult.remainingUsdc))} USDC ·{" "}
              <a
                href={`https://basescan.org/tx/${closeResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                view tx
              </a>
            </p>
          </div>
        )}

        {/* Refresh row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted">
            {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={loadCampaigns}
            className="text-xs text-muted hover:text-gray-900 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 bg-white border border-border rounded-2xl">
            <p className="text-muted mb-2">No campaigns yet.</p>
            <Link href="/admin/quick-create" className="text-sm text-primary hover:underline">
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const isClosing = closingId === c.id;
              const rules = Array.isArray(c.eligibilityRules) ? (c.eligibilityRules as EligibilityRule[]) : [];
              const partnerName = rules.find((r) => r.type === "social_task")?.taskId ?? c.name;
              const pct = Math.round((c.claimedCount / c.maxRecipients) * 100);
              return (
                <div key={c.id} className="bg-white border border-border rounded-2xl px-5 py-4 space-y-3">
                  <div className="flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isActive ? "bg-green-500" : "bg-gray-300"}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                        {c.isServerCreated ? (
                          <span className="flex-shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                            Server
                          </span>
                        ) : (
                          <span className="flex-shrink-0 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-muted">
                            {c.creatorWallet.slice(0, 6)}…{c.creatorWallet.slice(-4)}
                          </span>
                        )}
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-muted"}`}>
                          {c.isActive ? "Active" : "Closed"}
                        </span>
                      </div>
                      <p className="text-xs text-muted font-mono">
                        #{c.onChainId} · {fmt(Number(c.totalUsdc))} USDC · {c.claimedCount}/{c.maxRecipients} claimed ({pct}%)
                      </p>
                    </div>

                    {/* Claim link */}
                    <a
                      href={`/claim/${c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono flex-shrink-0"
                    >
                      Claim link
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>

                    {/* Action */}
                    {c.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={isClosing}
                        onClick={() => handleClose(c.id)}
                        className="flex-shrink-0 text-error border-red-200 hover:bg-red-50"
                      >
                        {isClosing ? "Closing…" : "Close & Withdraw"}
                      </Button>
                    ) : (
                      <span className="text-xs font-mono text-muted flex-shrink-0">Closed</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {partnerName && <CampaignScanProgress partnerName={partnerName} />}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
