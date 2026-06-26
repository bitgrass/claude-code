"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CampaignDashboard } from "@/components/admin/CampaignDashboard";
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
  creatorWallet: string;
  isServerCreated: boolean;
  eligibilityRules: EligibilityRule[] | null;
}

export default function AdminPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  const loadCampaigns = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (ready) loadCampaigns();
  }, [ready, refreshKey, loadCampaigns]);

  if (!ready) return null;

  const activeCount = campaigns.filter((c) => c.isActive).length;
  const totalUsdcRaw = campaigns.reduce((s, c) => s + Number(c.totalUsdc), 0);
  const totalClaims = campaigns.reduce((s, c) => s + c.claimedCount, 0);
  const fmt = (n: number) =>
    `$${(n / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="QRbase" className="h-8 w-auto" />
            <span className="font-bold text-base text-gray-900">
              QRbase <span className="text-primary">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/quick-create"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark border border-primary rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Create
            </Link>
            <Link
              href="/admin/manage"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-surface-muted border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Manage
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Stats bar */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Campaigns", value: String(campaigns.length) },
              { label: "Active", value: String(activeCount), sub: `${campaigns.length - activeCount} closed` },
              { label: "Total USDC Pool", value: fmt(totalUsdcRaw) },
              { label: "Total Claims", value: String(totalClaims) },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white border border-border rounded-2xl px-5 py-4">
                <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* All Campaigns */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">All Campaigns</h2>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="text-xs text-muted hover:text-gray-900 flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100" />
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
                const pct = Math.round((c.claimedCount / c.maxRecipients) * 100);
                const url = `https://airdrop.qrbase.xyz/claim/${c.id}`;
                return (
                  <div key={c.id} className="bg-white border border-border rounded-2xl px-5 py-4 space-y-3">
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
                          #{c.onChainId} · {fmt(Number(c.totalUsdc))} · {c.claimedCount}/{c.maxRecipients} claimed
                        </p>
                      </div>
                      <span className="hidden sm:block text-base font-bold font-mono text-gray-900 flex-shrink-0">
                        {fmt(Number(c.totalUsdc))}
                      </span>
                    </div>

                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent-purple transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {pct}% filled · {c.maxRecipients - c.claimedCount} slots remaining
                      </p>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={url}
                        className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-mono text-muted"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          setCopied(c.id);
                          setTimeout(() => setCopied(null), 2000);
                        }}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-surface-muted transition-colors"
                      >
                        {copied === c.id ? "Copied" : "Copy"}
                      </button>
                      <a
                        href={url}
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
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My Campaigns (wallet-specific) */}
        {isConnected ? (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">My Campaigns</h2>
            <CampaignDashboard key={refreshKey} />
          </section>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white border border-border rounded-2xl px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Connect your wallet</p>
              <p className="text-xs text-muted mt-0.5">
                See campaigns you created with your wallet address.
              </p>
            </div>
            <ConnectButton />
          </div>
        )}
      </main>
    </div>
  );
}
