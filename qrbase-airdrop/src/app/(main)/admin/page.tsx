"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CreateCampaignForm } from "@/components/admin/CreateCampaignForm";
import { CampaignDashboard } from "@/components/admin/CampaignDashboard";
import { AllCampaignsList } from "@/components/admin/AllCampaignsList";

const SESSION_KEY = "admin_verified";

export default function AdminPage() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SESSION_KEY)) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="QRbase" className="h-8 w-auto" />
              <span className="font-bold text-base text-gray-900">
                QRbase <span className="text-primary">Admin</span>
              </span>
            </Link>
            <Badge variant="default" className="hidden sm:flex">Dashboard</Badge>
          </div>
          <div className="flex items-center gap-3">
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
              href="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-gray-900 border border-border rounded-lg px-3 py-1.5 bg-white hover:bg-surface-muted transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {isConnected ? (
        /* Wallet connected — full dashboard: create form + own campaigns */
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">My Campaigns</h1>
            <p className="text-sm text-muted mt-1">Create and manage your airdrop campaigns.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)] gap-6 items-start">
            <div className="lg:sticky lg:top-[61px]">
              <CreateCampaignForm onCreated={() => setRefreshKey((k) => k + 1)} />
            </div>
            <div className="min-w-0">
              <CampaignDashboard key={refreshKey} />
            </div>
          </div>
        </div>
      ) : (
        /* No wallet — super admin overview: all campaigns */
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-7">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Campaigns</h1>
              <p className="text-sm text-muted mt-1">
                Overview of all campaigns. Connect your wallet to create and manage your own.
              </p>
            </div>
            <div className="flex-shrink-0 hidden sm:flex items-center gap-2 bg-primary-light border border-border rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
              <span className="text-xs text-primary font-medium">Connect wallet to manage your campaigns</span>
            </div>
          </div>
          <AllCampaignsList />
        </div>
      )}
    </div>
  );
}
