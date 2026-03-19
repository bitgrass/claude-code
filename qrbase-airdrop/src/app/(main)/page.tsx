"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";

const steps = [
  {
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    title: "Sign in with X",
    description:
      "Your QRbase session carries over — zero extra login friction",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    title: "Check Eligibility",
    description:
      "We verify your puzzle wins and $SCAN balance automatically",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "Claim USDC",
    description:
      "Receive your USDC reward directly on the Base blockchain",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen qr-pattern">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QR</span>
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
        <p className="text-white text-xs font-medium">
          Reward distribution layer for SCAN MODE campaigns on Base
        </p>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Powered by Base
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Claim your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">
              QRbase
            </span>{" "}
            reward
          </h1>
          <p className="text-muted text-lg max-w-xl mx-auto mb-8">
            Solved the SCAN MODE puzzle? Scan the QR code and claim your
            USDC airdrop reward on Base.
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
              <Card className="text-center h-full p-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                  {step.icon}
                </div>
                <div className="text-xs text-primary font-semibold mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-gray-900 font-semibold mb-2">
                  {step.title}
                </h3>
                <p className="text-muted text-sm">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">QR</span>
            </div>
            <span>QRbase Airdrop</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Built on Base</span>
            <a
              href="https://twitter.com/QRbase_Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
            >
              Twitter/X
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
