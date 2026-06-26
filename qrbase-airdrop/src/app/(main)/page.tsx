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
    iconAlt: <img src="/farcasterIcon.svg" alt="Farcaster" className="w-5 h-5" />,
    title: "Sign in with X or Farcaster",
    description: "Your QRbase account carries over — zero extra login friction.",
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    title: "One-Click Claim",
    description: "No wallet connection needed. USDC is sent automatically to your linked wallet on Base.",
  },
  {
    number: "04",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Receive USDC on Base",
    description: "Your reward lands directly in your claiming wallet. Fast, Onchain, verifiable.",
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

/* ── Scanner animation shown when no live campaign ── */
function AnimatedLogo() {
  // 5×5 QR-like dot pattern (1 = dark, 0 = faint)
  const qrPattern = [
    1,0,1,1,0,
    0,1,0,1,1,
    1,1,1,0,0,
    0,0,1,1,0,
    1,0,0,1,1,
  ];

  return (
    <div className="relative w-[440px] h-[440px] flex items-center justify-center select-none">
      {/* Outer ring — slow CW, square dots */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="220" cy="220" r="200" fill="none" stroke="rgba(79,70,229,0.13)" strokeWidth="1" strokeDasharray="6 16" />
        {/* Square dot at rightmost point */}
        <rect x="415" y="215" width="9" height="9" rx="1.5" fill="rgba(79,70,229,0.60)" />
      </motion.svg>

      {/* Middle ring — faster CCW, two square dots */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="220" cy="220" r="148" fill="none" stroke="rgba(79,70,229,0.19)" strokeWidth="1" strokeDasharray="4 11" />
        <rect x="363" y="215" width="9" height="9" rx="1.5" fill="rgba(99,102,241,0.75)" />
        <rect x="68"  y="215" width="9" height="9" rx="1.5" fill="rgba(99,102,241,0.75)" />
      </motion.svg>

      {/* Inner ring — medium CW, one square dot */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: "visible" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="220" cy="220" r="96" fill="none" stroke="rgba(79,70,229,0.26)" strokeWidth="1" strokeDasharray="3 8" />
        <rect x="311" y="215" width="7" height="7" rx="1" fill="rgba(79,70,229,0.90)" />
      </motion.svg>

      {/* Central glow */}
      <div
        className="absolute w-52 h-52 pointer-events-none rounded-sm"
        style={{ background: "radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)" }}
      />

      {/* QR scanner frame */}
      <div className="relative z-10 w-44 h-44">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-[2.5px] border-l-[2.5px] border-primary" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-[2.5px] border-r-[2.5px] border-primary" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[2.5px] border-l-[2.5px] border-primary" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[2.5px] border-r-[2.5px] border-primary" />

        {/* Scan area (clipped) */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Dot grid — QR-like pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
              {qrPattern.map((on, i) => (
                <motion.div
                  key={i}
                  className="w-5 h-5 rounded-sm"
                  style={{ background: on ? "rgba(79,70,229,0.55)" : "rgba(79,70,229,0.10)" }}
                  animate={{ opacity: on ? [0.55, 1, 0.55] : [0.10, 0.22, 0.10] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: (i * 0.07) % 2, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>

          {/* Scan line */}
          <motion.div
            className="absolute inset-x-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(79,70,229,0.7) 20%, rgba(99,102,241,1) 50%, rgba(79,70,229,0.7) 80%, transparent 100%)",
              boxShadow: "0 0 10px 3px rgba(79,70,229,0.35)",
            }}
            animate={{ y: [0, 168, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Hero right panel: campaign card or animated logo ── */
function HeroVisual() {
  const [data, setData] = useState<FeaturedData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/featured")
      .then((r) => r.json())
      .then((d: FeaturedData) => { setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  /* While loading, show the logo so there's no layout jump */
  if (!loaded || !data?.campaign) return <AnimatedLogo />;

  const { campaign, progress } = data;
  const pool = Number(campaign.totalUsdc) / 1e6;
  const fillPct = progress && progress.totalPieces > 0
    ? Math.min(100, (progress.piecesUnlocked / progress.totalPieces) * 100)
    : 0;
  const progressLabel = progress ? `${progress.piecesUnlocked} / ${progress.totalPieces} pieces unlocked` : null;
  const isComplete = fillPct >= 100;

  const cardContent = (
    <div className={`relative overflow-hidden bg-white border rounded-2xl p-6 transition-all shadow-sm ${isComplete ? "border-primary hover:shadow-primary/10 hover:shadow-lg" : "border-border"}`}>
      <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-primary opacity-5 rounded-full blur-2xl" />
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          {progress?.partnerLogo && (
            <img src={progress.partnerLogo} alt={campaign.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-border" />
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
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full"
    >
      <div className="flex items-center gap-2 mb-4">
        <motion.span
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-1 rounded-full text-xs font-mono font-semibold"
        >
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE NOW
        </motion.span>
      </div>
      {isComplete ? (
        <Link href={`/claim/${campaign.id}`} className="block group w-full">{cardContent}</Link>
      ) : (
        <div className="w-full">{cardContent}</div>
      )}
      {isComplete && (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Link
            href={`/claim/${campaign.id}`}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors shadow-sm"
          >
            Claim Reward
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="QRbase" className="h-8 w-auto" />
            <span className="inline-flex items-center bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Airdrop
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="text-xs font-mono text-muted bg-surface-muted border border-border px-2.5 py-1 rounded-full">
              Built on Base
            </span>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Dot-grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.45,
          }}
        />
        {/* Glow orbs */}
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)" }} />
        <div className="absolute top-10 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)" }} />

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left: copy */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="flex flex-col items-start"
            >
              <motion.span
                variants={itemVariants}
                className="inline-flex items-center gap-2 bg-primary-light border border-border text-primary px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold mb-6 tracking-wider"
              >
                <motion.span
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                />
                POWERED BY BASE
              </motion.span>

              <motion.h1
                variants={itemVariants}
                className="mb-5 text-5xl font-extrabold leading-[1.05] tracking-tight text-gray-900 lg:text-6xl"
              >
                Claim your{" "}
                <span
                  className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-purple to-primary bg-[length:200%_auto]"
                  style={{ WebkitBackgroundClip: "text" }}
                >
                  QRbase
                </span>
                <br />reward
              </motion.h1>

              <motion.p variants={itemVariants} className="mb-8 max-w-lg text-lg leading-relaxed text-muted">
                Solved the SCAN MODE puzzle? Sign in with X or Farcaster — eligibility is verified automatically and USDC lands directly in your linked wallet.
              </motion.p>

              <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                {["No bridging required", "No wallet connect needed", "X or Farcaster login"].map((label) => (
                  <div key={label} className="inline-flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {label}
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: animated logo or live campaign card */}
            <div className="flex items-center justify-center">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-20 space-y-20">

        {/* How it works */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
            className="mb-10 text-center"
          >
            <p className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-2">How it works</p>
            <h2 className="text-3xl font-bold text-gray-900">Four steps to your reward</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={containerVariants}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="relative bg-white border border-border rounded-2xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-shadow text-center cursor-default group"
              >
                <span className="absolute top-4 right-4 text-[10px] font-mono font-bold text-muted/50 group-hover:text-primary/50 transition-colors">
                  {step.number}
                </span>
                <div className="flex items-center justify-center gap-2 mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-light to-purple-50 border border-border rounded-xl flex items-center justify-center text-primary flex-shrink-0 shadow-sm">
                    {step.icon}
                  </div>
                  {step.dual && step.iconAlt && (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-pink-50 border border-border rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0 shadow-sm">
                      {step.iconAlt}
                    </div>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Stats strip */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden bg-white border border-border rounded-2xl shadow-sm"
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-40" />
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { value: "USDC", label: "Reward token on Base" },
              { value: "$SCAN", label: "Balance eligibility check" },
              { value: "Onchain", label: "Fully verifiable claims" },
            ].map((item, i) => (
              <motion.div
                key={item.value}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="px-8 py-8 text-center group"
              >
                <p className="text-2xl font-bold font-mono text-primary mb-1.5 group-hover:scale-105 transition-transform">
                  {item.value}
                </p>
                <p className="text-xs text-muted">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="QRbase" className="h-5 w-auto opacity-80" />
            <span className="font-mono text-xs text-muted">QRbase Airdrop</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono text-muted">
            <a href="https://qrbase.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              qrbase.xyz
            </a>
            <span>Built on Base</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
