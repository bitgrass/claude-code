"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    iconAlt: (
      <svg className="w-5 h-5" viewBox="0 0 1000 1000" fill="currentColor">
        <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
        <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
        <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
      </svg>
    ),
    title: "Sign in with X or Farcaster",
    description: "Your QRbase account carries over - zero extra login friction.",
    dual: true,
  },
  {
    number: "02",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Eligibility Verified",
    description: "We automatically check your puzzle wins and $SCAN balance using your connected identity.",
  },
  {
    number: "03",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
    title: "Connect Your Claiming Wallet",
    description: "Link any Base-compatible wallet. USDC goes here - completely separate from your social login.",
  },
  {
    number: "04",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Receive USDC on Base",
    description: "Your reward lands directly in your claiming wallet. Fast, on-chain, verifiable.",
  },
];

interface ScanModeProgress {
  partnerName: string;
  totalWins: number;
  piecesUnlocked: number;
  totalPieces: number;
  description: string | null;
  partnerLogo: string;
  reward: number;
  minPuzzleWins: number;
  minScanBalance: number;
}

interface FeaturedData {
  campaign: { id: string; name: string; tokenSymbol: string; totalUsdc: string; maxRecipients: number } | null;
  progress: ScanModeProgress | null;
}

function FeaturedCampaign() {
  const [data, setData] = useState<FeaturedData | null>(null);

  useEffect(() => {
    fetch("/api/admin/featured")
      .then((res) => res.json())
      .then((d: FeaturedData) => setData(d))
      .catch(() => setData(null));
  }, []);

  if (!data?.campaign) return null;

  const { campaign, progress } = data;
  const pool = Number(campaign.totalUsdc) / 1e6;

  const fillPct = progress && progress.totalPieces > 0
    ? Math.min(100, (progress.piecesUnlocked / progress.totalPieces) * 100)
    : 0;
  const progressLabel = progress
    ? `${progress.piecesUnlocked} / ${progress.totalPieces} pieces unlocked`
    : null;

  const isComplete = fillPct >= 100;

  const cardContent = (
    <div className={`bg-white border rounded-2xl p-6 transition-all shadow-sm ${isComplete ? "border-primary hover:border-primary/70" : "border-border"}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          {progress?.partnerLogo && (
            <img
              src={progress.partnerLogo}
              alt={campaign.name}
              className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-border"
            />
          )}
          <div>
            <h3 className="text-base font-bold text-gray-900 leading-tight">{campaign.name}</h3>
            {progress?.description && (
              <p className="text-xs text-muted mt-0.5 line-clamp-2 max-w-xs">{progress.description}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold font-mono text-primary">${pool.toLocaleString()}</p>
          <p className="text-xs text-muted">USDC pool</p>
        </div>
      </div>

      {progress && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {progress.minPuzzleWins > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-primary-light border border-border rounded-full px-3 py-1 text-xs font-mono font-semibold text-primary">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {progress.minPuzzleWins}+ wins
            </span>
          )}
          {progress.minScanBalance > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-primary-light border border-border rounded-full px-3 py-1 text-xs font-mono font-semibold text-primary">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {progress.minScanBalance.toLocaleString()} $SCAN
            </span>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs font-mono text-muted mb-1.5">
          <span>Puzzle progress</span>
          {progressLabel && <span>{progressLabel}</span>}
        </div>
        <div className="h-2 bg-primary-light rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all duration-500"
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mx-auto flex w-full flex-col items-center"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1 rounded-full text-xs font-mono font-semibold">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE NOW
        </span>
      </div>
      {isComplete ? (
        <Link href={`/claim/${campaign.id}`} className="block group w-full">
          {cardContent}
        </Link>
      ) : (
        <div className="w-full">{cardContent}</div>
      )}
      {isComplete && (
        <Link
          href={`/claim/${campaign.id}`}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
        >
          Claim Reward
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-mono">QR</span>
            </div>
            <span className="font-bold text-base text-gray-900">
              QRbase <span className="text-primary">Airdrop</span>
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted bg-surface-muted border border-border px-2.5 py-1 rounded-full">
              Built on Base
            </span>
          </nav>
        </div>
      </header>

      {/* Hero + Featured Campaign — 2-col layout */}
      <main className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="mb-20 flex flex-col items-center gap-10">
          {/* Left: hero copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto flex w-full flex-col items-center text-center"
          >
            <span className="inline-flex items-center gap-2 bg-primary-light border border-border text-primary px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold mb-6 tracking-wider">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              POWERED BY BASE
            </span>
            <h1 className="mb-5 max-w-4xl text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 lg:text-6xl">
              Claim your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">
                QRbase
              </span>{" "}
              reward
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted">
              Solved the SCAN MODE puzzle? Verify eligibility and receive USDC directly to your wallet on Base.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "No bridging required",
                "Any Base wallet",
                "X or Farcaster login",
              ].map((label) => (
                <div
                  key={label}
                  className="inline-flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: featured campaign card */}
          <div className="mx-auto w-full">
            <FeaturedCampaign />
          </div>
        </div>

        {/* How it works */}
        <section className="mb-20">
          <div className="mb-8 text-center">
            <p className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-1">How it works</p>
            <h2 className="text-2xl font-bold text-gray-900">Four steps to your reward</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * i, duration: 0.4 }}
                className="bg-white border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-primary-light rounded-xl flex items-center justify-center text-primary flex-shrink-0">
                    {step.icon}
                  </div>
                  {step.dual && step.iconAlt && (
                    <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                      {step.iconAlt}
                    </div>
                  )}
                </div>
                <p className="text-xs font-mono font-bold text-muted mb-1">{step.number}</p>
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5 leading-snug">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Stats strip */}
        <section className="bg-white border border-border rounded-2xl shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { value: "USDC", label: "Reward token on Base" },
              { value: "$SCAN", label: "Balance eligibility check" },
              { value: "On-chain", label: "Fully verifiable claims" },
            ].map((item) => (
              <div key={item.value} className="px-8 py-7 text-center">
                <p className="text-2xl font-bold font-mono text-primary mb-1">{item.value}</p>
                <p className="text-xs text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white mt-0">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs font-mono">QR</span>
            </div>
            <span className="font-mono text-xs text-muted">QRbase Airdrop</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-muted">
            <a href="https://qrbase.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              qrbase.xyz
            </a>
            <span>Built on Base</span>
            <a
              href="https://twitter.com/QRbase_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              @QRbase_Bot
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
