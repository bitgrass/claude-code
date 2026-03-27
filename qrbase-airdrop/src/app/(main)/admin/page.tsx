"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CreateCampaignForm } from "@/components/admin/CreateCampaignForm";
import { CampaignDashboard } from "@/components/admin/CampaignDashboard";

const SESSION_KEY = "admin_verified";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
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

      {!isConnected ? (
        /* Not connected — centered prompt */
        <div className="flex items-center justify-center min-h-[calc(100vh-57px)] p-8">
          <div className="bg-white border border-border rounded-2xl p-10 shadow-sm text-center max-w-sm w-full">
            <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Connect a Wallet</h2>
            <p className="text-muted text-sm mb-6">Connect your wallet to create and manage airdrop campaigns.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      ) : (
        /* Dashboard layout */
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900">Campaign Dashboard</h1>
            <p className="text-sm text-muted mt-1">Create and manage your QRbase airdrop campaigns.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)] gap-6 items-start">
            {/* Left sidebar — Create Campaign */}
            <div className="lg:sticky lg:top-[61px]">
              <CreateCampaignForm onCreated={() => setRefreshKey((k) => k + 1)} />
            </div>

            {/* Right main area — Campaign list */}
            <div className="min-w-0">
              <CampaignDashboard key={refreshKey} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
