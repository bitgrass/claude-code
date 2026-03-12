"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ClaimSuccessProps {
  amount: bigint;
  txHash: string;
  campaignId: string;
}

function formatUSDC(amount: bigint): string {
  const num = Number(amount) / 1e6;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ClaimSuccess({ amount, txHash, campaignId }: ClaimSuccessProps) {
  const basescanUrl = `https://basescan.org/tx/${txHash}`;
  const shareText = encodeURIComponent(
    `Just claimed ${formatUSDC(amount)} USDC from @QRbase_Bot's airdrop on Base! Solve the next QR challenge to win yours #QRbase #Base`
  );
  const shareUrl = encodeURIComponent(
    `${typeof window !== "undefined" ? window.location.origin : ""}/campaigns/${campaignId}`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <Card variant="highlighted" className="text-center">
        {/* Confetti effect */}
        <motion.div
          className="text-6xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          🎉
        </motion.div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Reward Claimed!
        </h2>

        <motion.p
          className="text-4xl font-bold text-success mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          +${formatUSDC(amount)} USDC
        </motion.p>

        <p className="text-muted text-sm mb-6">
          Your USDC has been sent to your wallet on Base.
        </p>

        <div className="bg-surface-light rounded-xl p-3 mb-6">
          <p className="text-xs text-muted mb-1">Transaction Hash</p>
          <a
            href={basescanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-xs font-mono hover:underline break-all"
          >
            {txHash}
          </a>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={() => window.open(basescanUrl, "_blank")}
          >
            View on Basescan
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={() => window.open(tweetUrl, "_blank")}
          >
            Share on X
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
