"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SESSION_KEY = "admin_verified";

interface Result {
  claimUrl: string;
  campaignId: string;
  onChainId: string;
  adminWallet: string;
  createTx: string;
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

  const apiKey = () => localStorage.getItem(SESSION_KEY) ?? "";

  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
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
          <div className="flex items-center gap-2">
            <Link
              href="/admin/manage"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-surface-muted border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Manage
            </Link>
            <span className="text-xs font-mono text-muted bg-surface-muted border border-border px-3 py-1.5 rounded-lg">
              CDP Server Wallet
            </span>
          </div>
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

        {/* Link to manage page */}
        <div className="max-w-2xl mx-auto">
          <Link
            href="/admin/manage"
            className="flex items-center justify-between bg-white border border-border rounded-2xl px-5 py-4 hover:bg-surface-muted transition-colors group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">Manage Campaigns</p>
              <p className="text-xs text-muted mt-0.5">Close campaigns and withdraw remaining USDC.</p>
            </div>
            <svg className="w-4 h-4 text-muted group-hover:text-gray-900 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
