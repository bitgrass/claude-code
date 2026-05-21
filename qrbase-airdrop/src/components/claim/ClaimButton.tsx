"use client";

import { Button } from "@/components/ui/Button";

interface ClaimButtonProps {
  amount: string;
  slotPosition: number;
  loading: boolean;
  disabled?: boolean;
  onClaim: () => void;
}

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

export function ClaimButton({
  amount,
  slotPosition,
  loading,
  disabled = false,
  onClaim,
}: ClaimButtonProps) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-lg text-gray-700">
        You are <span className="font-bold text-primary">#{slotPosition}</span>{" "}
        in queue
      </p>
      <Button
        size="lg"
        className="w-full text-lg"
        loading={loading}
        disabled={disabled}
        onClick={onClaim}
      >
        {loading
          ? "Sending USDC to your wallet..."
          : `Claim ${formatUsdc(amount)} USDC`}
      </Button>
      <p className="text-xs text-muted">
        Actual amount locks at claim time based on your position
      </p>
    </div>
  );
}
