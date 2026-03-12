"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { CreateCampaignForm } from "@/components/admin/CreateCampaignForm";
import { CampaignDashboard } from "@/components/admin/CampaignDashboard";

export default function AdminPage() {
  const { isConnected } = useAccount();

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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-muted hover:text-white text-sm transition-colors"
            >
              Home
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">
          Campaign Admin
        </h1>
        <p className="text-muted mb-8">
          Create and manage your QRbase airdrop campaigns.
        </p>

        {!isConnected ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-6">
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
            <h2 className="text-xl font-semibold text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-muted text-sm mb-6">
              Connect your wallet to create and manage campaigns.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <CreateCampaignForm />

            <div>
              <h2 className="text-xl font-bold text-white mb-4">
                Your Campaigns
              </h2>
              <CampaignDashboard />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
