"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateCampaignForm } from "@/components/admin/CreateCampaignForm";
import { CampaignDashboard } from "@/components/admin/CampaignDashboard";
import type { CampaignData } from "@/types";

function CampaignsList() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns?active=true")
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="text-center py-8 px-6">
        <p className="text-muted">No active campaigns right now.</p>
        <p className="text-muted text-sm mt-1">
          Follow{" "}
          <a
            href="https://twitter.com/QRbase_Bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            @QRbase_Bot
          </a>{" "}
          for future QR challenges.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => {
        const pool = Number(campaign.totalUsdc) / 1e6;
        const slotsLeft = campaign.maxRecipients - (campaign.claimedCount || 0);
        const progress = ((campaign.claimedCount || 0) / campaign.maxRecipients) * 100;

        return (
          <Link key={campaign.id} href={`/claim/${campaign.id}`}>
            <Card className="p-5 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <Badge variant="success">Active</Badge>
                </div>
                <span className="text-xs font-medium text-primary">${campaign.tokenSymbol}</span>
              </div>
              <div className="flex items-end justify-between mb-3">
                <p className="text-2xl font-bold text-gray-900">
                  ${pool.toLocaleString()}{" "}
                  <span className="text-muted text-sm font-normal">USDC</span>
                </p>
                <p className="text-sm text-muted">{slotsLeft} slots remaining</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const { authenticated, login, connectWallet, logout } = usePrivy();
  const { wallets } = useWallets();
  const hasWallet = wallets.length > 0;
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen qr-pattern">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QR</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              QRbase <span className="text-primary">Airdrop</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted hover:text-gray-900 text-sm transition-colors"
            >
              Home
            </Link>
            {authenticated && hasWallet && (
              <span className="text-xs font-mono text-muted bg-surface-muted px-2 py-1 rounded-lg">
                {wallets[0].address.slice(0, 6)}...
                {wallets[0].address.slice(-4)}
              </span>
            )}
            {authenticated && (
              <button
                onClick={logout}
                className="text-xs text-error hover:underline"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Campaign Admin
        </h1>
        <p className="text-muted mb-8">
          Create and manage your QRbase airdrop campaigns.
        </p>

        {/* Public: Active Campaigns */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Campaigns</h2>
          <CampaignsList />
        </div>

        <hr className="border-border mb-8" />

        {!authenticated ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connect to Continue
            </h2>
            <p className="text-muted text-sm mb-6">
              Sign in and connect your wallet to create and manage campaigns.
            </p>
            <Button size="lg" onClick={login}>
              Sign In
            </Button>
          </div>
        ) : !hasWallet ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connect a Wallet
            </h2>
            <p className="text-muted text-sm mb-6">
              Connect MetaMask or another wallet to create campaigns.
            </p>
            <Button size="lg" onClick={connectWallet}>
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <CreateCampaignForm
              onCreated={() => setRefreshKey((k) => k + 1)}
            />
            <CampaignDashboard key={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}
