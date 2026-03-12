"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface CampaignListItem {
  id: string;
  onChainId: number;
  totalAmount: string;
  maxRecipients: number;
  splitType: string;
  isActive: boolean;
  claimedCount: number;
  remainingAmount: string;
  createdAt: string;
}

const steps = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    title: "Sign in with X",
    description: "Verify your Twitter/X identity to prove you solved the QR challenge",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
    title: "Connect Wallet",
    description: "Connect your Base wallet (Coinbase Wallet, MetaMask, or WalletConnect)",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Claim USDC",
    description: "Receive your USDC reward directly on the Base blockchain",
  },
];

export default function HomePage() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns?active=true")
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">QR</span>
            </div>
            <span className="font-bold text-lg text-white">
              QRbase <span className="text-accent">Airdrop</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-muted hover:text-white text-sm transition-colors"
            >
              Admin
            </Link>
            <a
              href="https://twitter.com/QRbase_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-white text-sm transition-colors"
            >
              @QRbase_Bot
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Powered by Base
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Claim your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-orange">
              QRbase
            </span>{" "}
            reward
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto mb-8">
            Solved a QR challenge? Connect your X account and Base wallet to
            claim your USDC airdrop reward.
          </p>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-center text-sm font-semibold text-muted uppercase tracking-widest mb-8">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <Card className="text-center h-full">
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent">
                  {step.icon}
                </div>
                <div className="text-xs text-accent font-semibold mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-muted text-sm">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Active Campaigns */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <h2 className="text-center text-sm font-semibold text-muted uppercase tracking-widest mb-8">
          Active Campaigns
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-muted">No active campaigns right now.</p>
            <p className="text-muted text-sm mt-1">
              Follow{" "}
              <a
                href="https://twitter.com/QRbase_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                @QRbase_Bot
              </a>{" "}
              for future QR challenges.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const pool = Number(campaign.totalAmount) / 1e6;
              const slotsLeft = campaign.maxRecipients - campaign.claimedCount;
              const progress =
                (campaign.claimedCount / campaign.maxRecipients) * 100;

              return (
                <motion.div
                  key={campaign.id}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Card className="hover:border-accent/20 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="success">Active</Badge>
                          <Badge variant="warning">{campaign.splitType}</Badge>
                        </div>
                        <span className="text-xs text-muted">
                          #{campaign.onChainId}
                        </span>
                      </div>
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            ${pool.toFixed(2)}{" "}
                            <span className="text-muted text-sm font-normal">
                              USDC
                            </span>
                          </p>
                        </div>
                        <p className="text-sm text-muted">
                          {slotsLeft} slots remaining
                        </p>
                      </div>
                      <div className="h-1.5 bg-surface-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-accent-orange rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* How to win */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <Card className="text-center">
          <h3 className="text-lg font-bold text-white mb-2">
            How to Win Future Campaigns
          </h3>
          <p className="text-muted text-sm mb-4">
            Follow @QRbase_Bot on X and solve QR challenges to earn USDC
            rewards. New puzzles are posted regularly!
          </p>
          <a
            href="https://twitter.com/QRbase_Bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="md">
              Follow @QRbase_Bot on X
            </Button>
          </a>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-accent rounded flex items-center justify-center">
              <span className="text-background font-bold text-xs">QR</span>
            </div>
            <span>QRbase Airdrop</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Built on Base</span>
            <a
              href="https://twitter.com/QRbase_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Twitter/X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
