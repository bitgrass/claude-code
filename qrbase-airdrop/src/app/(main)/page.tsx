"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    iconAlt: (
      <svg className="w-6 h-6" viewBox="0 0 1000 1000" fill="currentColor">
        <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
        <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
        <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
      </svg>
    ),
    title: "Sign in with X or Farcaster",
    description: "Your QRbase account carries over — zero extra login friction.",
    dual: true,
  },
  {
    number: "02",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Eligibility Verified",
    description: "We automatically check your puzzle wins and $SCAN balance using your connected identity.",
  },
  {
    number: "03",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
    title: "Connect Your Claiming Wallet",
    description: "Link any Base-compatible wallet. USDC goes here — completely separate from your social login.",
  },
  {
    number: "04",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Receive USDC on Base",
    description: "Your reward lands directly in your claiming wallet. Fast, on-chain, verifiable.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen qr-pattern">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-mono">QR</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              QRbase <span className="text-primary">Airdrop</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-muted hover:text-gray-900 text-sm transition-colors"
            >
              Admin
            </Link>
            <a
              href="https://twitter.com/QRbase_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-gray-900 text-sm transition-colors"
            >
              @QRbase_Bot
            </a>
          </nav>
        </div>
      </header>

      {/* Gradient banner */}
      <div className="gradient-banner py-2 text-center">
        <p className="text-white text-xs font-medium tracking-wide">
          Reward distribution layer for SCAN MODE campaigns &mdash; built on Base
        </p>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary-light border border-border text-primary px-4 py-1.5 rounded-full text-xs font-mono font-semibold mb-6 tracking-wider">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            POWERED BY BASE
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight leading-none">
            Claim your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">
              QRbase
            </span>{" "}
            reward
          </h1>
          <p className="text-muted text-lg max-w-lg mx-auto mb-10">
            Solved the SCAN MODE puzzle? Scan the QR code, verify eligibility, and receive USDC directly to your wallet on Base.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 shadow-sm">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No bridging required
            </div>
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 shadow-sm">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Any Base wallet
            </div>
            <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm text-gray-700 shadow-sm">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              X or Farcaster login
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-xs font-mono font-semibold text-primary uppercase tracking-widest mb-2">
            How it works
          </h2>
          <p className="text-gray-900 text-xl font-bold">Four steps to your reward</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.45 }}
              className="relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-4 h-px bg-border z-10" />
              )}

              <div className="bg-white border border-border rounded-2xl p-5 h-full hover:border-primary/40 hover:shadow-sm transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                    {step.icon}
                  </div>
                  {step.dual && step.iconAlt && (
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-600">
                      {step.iconAlt}
                    </div>
                  )}
                </div>
                <div className="step-number mb-1">{step.number}</div>
                <h3 className="text-gray-900 font-semibold text-sm mb-1.5 leading-snug">
                  {step.title}
                </h3>
                <p className="text-muted text-xs leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Info strip */}
      <section className="border-t border-border bg-white py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold font-mono text-primary mb-1">USDC</p>
              <p className="text-sm text-muted">Reward token on Base</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-primary mb-1">$SCAN</p>
              <p className="text-sm text-muted">Balance eligibility check</p>
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-primary mb-1">On-chain</p>
              <p className="text-sm text-muted">Fully verifiable claims</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs font-mono">QR</span>
            </div>
            <span className="font-mono text-xs">QRbase Airdrop</span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
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
