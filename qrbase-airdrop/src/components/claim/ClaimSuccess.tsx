"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

interface ClaimSuccessProps {
  amount: string;
  txHash: string;
}

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1,
      color: ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"][
        Math.floor(Math.random() * 5)
      ],
      size: 4 + Math.random() * 6,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            rotate: 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}

export function ClaimSuccess({ amount, txHash }: ClaimSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const basescanUrl = `https://basescan.org/tx/${txHash}`;
  const formattedAmount = formatUsdc(amount);
  const tweetText = encodeURIComponent(
    `Just claimed ${formattedAmount} USDC from @QRbase_Bot's airdrop on Base!\n\nBe ready for the next one \u2192 qrbase.xyz #QRbase #Base #SCAN`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <>
      {showConfetti && <Confetti />}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="text-center space-y-6"
      >
        <div className="text-6xl mb-4">&#127878;</div>
        <h2 className="text-2xl font-bold text-gray-900">
          You claimed {formattedAmount} USDC!
        </h2>
        <p className="text-muted">
          USDC has been sent to your wallet on Base.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={basescanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-dark text-sm font-medium underline"
          >
            View transaction on Basescan &rarr;
          </a>

          <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full">
              Share on X
            </Button>
          </a>
        </div>
      </motion.div>
    </>
  );
}
