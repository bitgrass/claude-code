"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  QRBASE_AIRDROP_ABI,
  ERC20_ABI,
} from "@/lib/contract";

interface FormState {
  totalAmount: string;
  maxRecipients: string;
  splitType: "EQUAL" | "RANDOM";
  minAccountAgeDays: number;
  minFollowers: number;
  minFollowing: number;
  requireVerified: boolean;
}

export function CreateCampaignForm({ onCreated }: { onCreated?: () => void }) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [form, setForm] = useState<FormState>({
    totalAmount: "",
    maxRecipients: "",
    splitType: "EQUAL",
    minAccountAgeDays: 90,
    minFollowers: 50,
    minFollowing: 5,
    requireVerified: false,
  });

  const [step, setStep] = useState<"form" | "approving" | "creating" | "done">("form");
  const [error, setError] = useState<string | null>(null);

  const handleApproveAndCreate = async () => {
    if (!address) return;
    setError(null);

    const amount = parseUnits(form.totalAmount, 6);
    const maxRecipients = parseInt(form.maxRecipients);

    if (maxRecipients < 1 || maxRecipients > 500) {
      setError("Recipients must be between 1 and 500");
      return;
    }
    if (Number(form.totalAmount) > 2000) {
      setError("Maximum campaign amount is $2,000 USDC");
      return;
    }

    try {
      // Step 1: Approve USDC
      setStep("approving");
      writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amount],
      });
    } catch {
      setError("Transaction failed. Please try again.");
      setStep("form");
    }
  };

  const handleCreateCampaign = async () => {
    const amount = parseUnits(form.totalAmount, 6);
    const maxRecipients = parseInt(form.maxRecipients);

    try {
      setStep("creating");
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: QRBASE_AIRDROP_ABI,
        functionName: "createCampaign",
        args: [amount, BigInt(maxRecipients), form.splitType === "EQUAL" ? 0 : 1],
      });

      // Record in DB
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorWallet: address,
          totalAmount: amount.toString(),
          maxRecipients,
          splitType: form.splitType,
          antiBot: {
            minAccountAgeDays: form.minAccountAgeDays,
            minFollowers: form.minFollowers,
            minFollowing: form.minFollowing,
            requireVerified: form.requireVerified,
          },
        }),
      });

      setStep("done");
      onCreated?.();
    } catch {
      setError("Failed to create campaign");
      setStep("form");
    }
  };

  if (step === "done" || isSuccess) {
    return (
      <Card variant="highlighted" className="text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-success mb-2">Campaign Created!</h3>
        <p className="text-muted text-sm mb-4">
          Your campaign is now live and accepting claims.
        </p>
        {hash && (
          <a
            href={`https://basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-sm hover:underline"
          >
            View transaction
          </a>
        )}
        <Button
          variant="outline"
          size="md"
          className="mt-4"
          onClick={() => {
            setStep("form");
            setForm({
              totalAmount: "",
              maxRecipients: "",
              splitType: "EQUAL",
              minAccountAgeDays: 90,
              minFollowers: 50,
              minFollowing: 5,
              requireVerified: false,
            });
          }}
        >
          Create Another
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-bold text-white mb-6">Create New Campaign</h3>

      <div className="space-y-5">
        {/* USDC Amount */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Total USDC Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              type="number"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
              placeholder="100.00"
              min="1"
              max="2000"
              step="0.01"
              className="w-full bg-surface-light border border-white/10 rounded-xl pl-7 pr-16 py-2.5 text-white placeholder-muted/50 focus:outline-none focus:border-accent/50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              USDC
            </span>
          </div>
        </div>

        {/* Max Recipients */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Max Recipients (1-500)
          </label>
          <input
            type="number"
            value={form.maxRecipients}
            onChange={(e) => setForm({ ...form, maxRecipients: e.target.value })}
            placeholder="50"
            min="1"
            max="500"
            className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-muted/50 focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* Split Type */}
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">
            Split Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["EQUAL", "RANDOM"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setForm({ ...form, splitType: type })}
                className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  form.splitType === type
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-white/10 bg-surface-light text-muted hover:border-white/20"
                }`}
              >
                {type === "EQUAL" ? "Equal Split" : "Random Split"}
                <p className="text-xs mt-0.5 font-normal opacity-70">
                  {type === "EQUAL"
                    ? "Everyone gets the same"
                    : "20%-200% of average"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Anti-Bot Settings */}
        <div className="border-t border-white/5 pt-5">
          <h4 className="text-sm font-semibold text-white mb-4">
            Anti-Bot Rules
          </h4>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Min Account Age</span>
                <span className="text-white">{form.minAccountAgeDays} days</span>
              </div>
              <input
                type="range"
                min="0"
                max="365"
                value={form.minAccountAgeDays}
                onChange={(e) =>
                  setForm({ ...form, minAccountAgeDays: parseInt(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Min Followers</span>
                <span className="text-white">{form.minFollowers}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="10"
                value={form.minFollowers}
                onChange={(e) =>
                  setForm({ ...form, minFollowers: parseInt(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Min Following</span>
                <span className="text-white">{form.minFollowing}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="5"
                value={form.minFollowing}
                onChange={(e) =>
                  setForm({ ...form, minFollowing: parseInt(e.target.value) })
                }
                className="w-full accent-accent"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireVerified}
                onChange={(e) =>
                  setForm({ ...form, requireVerified: e.target.checked })
                }
                className="w-4 h-4 rounded accent-accent"
              />
              <span className="text-sm text-muted">
                Require verified account (X Blue)
              </span>
            </label>
          </div>
        </div>

        {error && <p className="text-error text-sm">{error}</p>}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={isPending || isConfirming}
          onClick={step === "approving" ? handleCreateCampaign : handleApproveAndCreate}
        >
          {step === "approving"
            ? "Step 2: Create Campaign"
            : step === "creating"
            ? "Creating..."
            : "Approve USDC & Create Campaign"}
        </Button>
      </div>
    </Card>
  );
}
