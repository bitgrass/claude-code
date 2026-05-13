"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CampaignScanProgress } from "@/components/admin/CampaignScanProgress";
import type { EligibilityRule } from "@/types";

const SESSION_KEY = "admin_verified";

interface Result {
  claimUrl: string;
  campaignId: string;
  onChainId: string;
  adminWallet: string;
  createTx: string;
}

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

export default function QuickCreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    totalUsdc: "",
    maxRecipients: "10",
    minPuzzleWins: "20",
    minLevel: "0",
    minScanBalanceUsd: "0",
    partnerTokenAddress: "",
    partnerTokenSymbol: "",
    partnerTokenMinUsd: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  // Campaign list
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<{ txHash: string; remainingUsdc: string } | null>(null);

  const apiKey = () => localStorage.getItem(SESSION_KEY) ?? "";

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        headers: { "x-api-key": apiKey() },
      });
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns);
    } finally {
      setLoadingCampaigns(false);
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

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/auto-create", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey() },
        body: JSON.stringify({
          name: form.name,
          totalUsdc: parseFloat(form.totalUsdc),
          maxRecipients: parseInt(form.maxRecipients),
          minPuzzleWins: parseInt(form.minPuzzleWins) || 0,
          minLevel: parseInt(form.minLevel) || 0,
          minScanBalanceUsd: parseFloat(form.minScanBalanceUsd) || 0,
          partnerTokenAddress: form.partnerTokenAddress || undefined,
          partnerTokenSymbol: form.partnerTokenSymbol || undefined,
          partnerTokenMinUsd: parseFloat(form.partnerTokenMinUsd) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      setResult(data as Result);
      loadCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

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

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const perSlot =
    form.totalUsdc && form.maxRecipients
      ? (parseFloat(form.totalUsdc) / parseInt(form.maxRecipients)).toFixed(2)
      : null;

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="QRbase" className="h-6 w-auto" />
              <span className="font-bold text-sm text-gray-900">
                QRbase <span className="text-primary">Quick Create</span>
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-muted bg-surface-muted border border-border px-3 py-1.5 rounded-lg">
            CDP Server Wallet
          </span>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* ── Create ── */}
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Quick Campaign Creator</h1>
            <p className="text-sm text-muted">
              The CDP server wallet signs and funds the campaign on-chain automatically. You get a claim URL ready to paste into your QR generator.
            </p>
          </div>

          <Card className="p-6 space-y-6">
            {/* Campaign name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                placeholder="$SCAN Airdrop #2"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* USDC + slots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Total USDC</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-mono">$</span>
                  <input
                    type="number"
                    min="1"
                    className="w-full pl-7 pr-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    placeholder="100"
                    value={form.totalUsdc}
                    onChange={(e) => setForm((f) => ({ ...f, totalUsdc: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reward Slots</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                  value={form.maxRecipients}
                  onChange={(e) => setForm((f) => ({ ...f, maxRecipients: e.target.value }))}
                />
              </div>
            </div>

            {perSlot && (
              <div className="flex items-center gap-2 bg-primary-light border border-border rounded-xl px-4 py-2.5">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-primary font-mono font-semibold">
                  ${perSlot} USDC per recipient (equal split)
                </span>
              </div>
            )}

            {/* Eligibility rules */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Eligibility Rules</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Min Puzzle Wins</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    value={form.minPuzzleWins}
                    onChange={(e) => setForm((f) => ({ ...f, minPuzzleWins: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Min Level</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    value={form.minLevel}
                    onChange={(e) => setForm((f) => ({ ...f, minLevel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Min $SCAN Value (USD)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    value={form.minScanBalanceUsd}
                    onChange={(e) => setForm((f) => ({ ...f, minScanBalanceUsd: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted mt-2">Set to 0 to skip. Values are in USD — e.g. 10 means $10 worth of SCAN.</p>
            </div>

            {/* Partner token rule */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Partner Token Rule <span className="text-xs font-normal text-muted">(optional)</span></p>
              <p className="text-xs text-muted mb-3">Add a balance check for your own token. Leave blank to skip.</p>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-1.5">Token Contract Address</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm font-mono"
                      placeholder="0x..."
                      value={form.partnerTokenAddress}
                      onChange={(e) => setForm((f) => ({ ...f, partnerTokenAddress: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1.5">Symbol</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                      placeholder="TOKEN"
                      value={form.partnerTokenSymbol}
                      onChange={(e) => setForm((f) => ({ ...f, partnerTokenSymbol: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Min Value (USD)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-primary text-sm"
                    placeholder="e.g. 25"
                    value={form.partnerTokenMinUsd}
                    onChange={(e) => setForm((f) => ({ ...f, partnerTokenMinUsd: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!form.name || !form.totalUsdc || !form.maxRecipients}
              onClick={handleCreate}
            >
              {loading ? "Creating campaign on-chain…" : "Create Campaign & Get Link"}
            </Button>

            {loading && (
              <p className="text-xs text-center text-muted">
                Approving USDC then creating campaign on Base — this takes ~30s.
              </p>
            )}
          </Card>

          {/* Result */}
          {result && (
            <div className="mt-6 bg-white border border-primary rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Campaign created on-chain!</p>
                  <p className="text-xs text-muted">Paste the claim URL into your QR generator.</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mb-2">Claim URL</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result.claimUrl}
                    className="flex-1 px-3 py-2.5 bg-primary-light border border-border rounded-xl text-sm font-mono truncate"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopy} className="flex-shrink-0 px-4">
                    {copied ? "✓ Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-surface-muted rounded-xl px-3 py-2.5">
                  <p className="text-muted mb-0.5">Campaign ID</p>
                  <p className="text-gray-700 truncate">{result.campaignId}</p>
                </div>
                <div className="bg-surface-muted rounded-xl px-3 py-2.5">
                  <p className="text-muted mb-0.5">On-chain ID</p>
                  <p className="text-gray-700">#{result.onChainId}</p>
                </div>
                <div className="col-span-2 bg-surface-muted rounded-xl px-3 py-2.5">
                  <p className="text-muted mb-0.5">Transaction</p>
                  <a
                    href={`https://basescan.org/tx/${result.createTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate block"
                  >
                    {result.createTx}
                  </a>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setResult(null);
                  setForm({ name: "", totalUsdc: "", maxRecipients: "10", minPuzzleWins: "20", minLevel: "0", minScanBalanceUsd: "0", partnerTokenAddress: "", partnerTokenSymbol: "", partnerTokenMinUsd: "" });
                }}
              >
                Create Another
              </Button>
            </div>
          )}
        </div>

        {/* ── Manage Campaigns ── */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Campaigns</h2>
              <p className="text-xs text-muted">Close a campaign to stop new claims and withdraw remaining USDC back to the CDP wallet.</p>
            </div>
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

          {closeError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
              {closeError}
            </div>
          )}
          {closeResult && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 space-y-1">
              <p className="font-semibold">Campaign closed — remaining USDC withdrawn to CDP wallet.</p>
              <p className="font-mono text-xs">
                Returned: ${(Number(closeResult.remainingUsdc) / 1e6).toFixed(2)} USDC &middot;{" "}
                <a
                  href={`https://basescan.org/tx/${closeResult.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  tx
                </a>
              </p>
            </div>
          )}

          {loadingCampaigns ? (
            <p className="text-sm text-muted text-center py-8">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">No campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const totalUsdcDollars = (Number(c.totalUsdc) / 1e6).toFixed(2);
                const isClosing = closingId === c.id;
                const rules = Array.isArray(c.eligibilityRules) ? c.eligibilityRules as EligibilityRule[] : [];
                const partnerName = rules.find((r) => r.type === "social_task")?.taskId ?? c.name;
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-border rounded-2xl px-5 py-4 space-y-0"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isActive ? "bg-green-500" : "bg-gray-300"}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
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
                        </div>
                        <p className="text-xs text-muted font-mono">
                          #{c.onChainId} &middot; ${totalUsdcDollars} USDC &middot; {c.claimedCount}/{c.maxRecipients} claimed
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

                    {partnerName && <CampaignScanProgress partnerName={partnerName} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
