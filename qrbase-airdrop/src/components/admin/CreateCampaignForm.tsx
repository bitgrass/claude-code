"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { EligibilityRule, RewardTier } from "@/types";

interface FormData {
  name: string;
  tokenSymbol: string;
  tokenAddress: string;
  totalUsdc: string;
  maxRecipients: string;
  rewardType: "equal" | "tiered";
  tierAmounts: string[];
  rules: EligibilityRule[];
}

export function CreateCampaignForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [form, setForm] = useState<FormData>({
    name: "",
    tokenSymbol: "SCAN",
    tokenAddress: "",
    totalUsdc: "",
    maxRecipients: "10",
    rewardType: "equal",
    tierAmounts: [],
    rules: [
      { type: "puzzle_wins", token: "SCAN", min: 20 },
      { type: "token_balance", token: "SCAN", min: 100000 },
    ],
  });
  const [loading, setLoading] = useState(false);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecipientsChange = (val: string) => {
    const count = parseInt(val) || 0;
    setForm((prev) => ({
      ...prev,
      maxRecipients: val,
      tierAmounts:
        prev.rewardType === "tiered"
          ? Array.from({ length: count }, (_, i) => prev.tierAmounts[i] || "")
          : [],
    }));
  };

  const handleRewardTypeChange = (type: "equal" | "tiered") => {
    const count = parseInt(form.maxRecipients) || 0;
    setForm((prev) => ({
      ...prev,
      rewardType: type,
      tierAmounts:
        type === "tiered" ? Array.from({ length: count }, () => "") : [],
    }));
  };

  const updateTierAmount = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      tierAmounts: prev.tierAmounts.map((t, i) => (i === index ? value : t)),
    }));
  };

  const updateRule = (
    index: number,
    field: keyof EligibilityRule,
    value: string | number
  ) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        { type: "puzzle_wins", token: "SCAN", min: 0 },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!walletClient || !address) return;
    setLoading(true);
    setError(null);

    try {
      const totalUsdcRaw = Math.round(parseFloat(form.totalUsdc) * 1e6);
      const maxRecipients = parseInt(form.maxRecipients);

      let tiers: RewardTier[];
      let tierAmountsForContract: bigint[];

      if (form.rewardType === "equal") {
        const perSlot = Math.floor(totalUsdcRaw / maxRecipients);
        tiers = [{ position: 1, amount: perSlot }];
        tierAmountsForContract = [BigInt(perSlot)];
      } else {
        tiers = form.tierAmounts.map((amount, i) => ({
          position: i + 1,
          amount: Math.round(parseFloat(amount) * 1e6),
        }));
        tierAmountsForContract = tiers.map((t) => BigInt(t.amount));
      }

      // Step 1: Create on-chain via user's wallet
      const { encodeFunctionData } = await import("viem");
      const { QRBASE_AIRDROP_ABI, ERC20_ABI } = await import(
        "@/lib/contract"
      );

      const contractAddress =
        process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "";
      const usdcAddress =
        process.env.NEXT_PUBLIC_USDC_ADDRESS ||
        "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

      // Approve USDC
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress as `0x${string}`, BigInt(totalUsdcRaw)],
      });

      await walletClient.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: usdcAddress as `0x${string}`,
            data: approveData,
          },
        ],
      });

      // Create campaign
      const createData = encodeFunctionData({
        abi: QRBASE_AIRDROP_ABI,
        functionName: "createCampaign",
        args: [
          BigInt(totalUsdcRaw),
          BigInt(maxRecipients),
          tierAmountsForContract,
        ],
      });

      const createTxHash = await walletClient.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: contractAddress as `0x${string}`,
            data: createData,
          },
        ],
      }) as `0x${string}`;

      // Wait for receipt and extract the real campaignId from CampaignCreated event
      const { publicClient, QRBASE_AIRDROP_ABI: ABI } = await import("@/lib/contract");
      const { parseEventLogs } = await import("viem");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
      const logs = parseEventLogs({ abi: ABI, eventName: "CampaignCreated", logs: receipt.logs });
      const onChainId = logs[0].args.campaignId.toString();

      // Step 2: Create DB record via API
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          tokenSymbol: form.tokenSymbol,
          tokenAddress: form.tokenAddress,
          totalUsdc: totalUsdcRaw.toString(),
          maxRecipients,
          tiers,
          eligibilityRules: form.rules,
          onChainId,
          creatorWallet: address,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClaimUrl(data.claimUrl);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const tierSum = form.tierAmounts.reduce(
    (sum, a) => sum + (parseFloat(a) || 0),
    0
  );

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">
        Create Campaign
      </h2>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Name
        </label>
        <input
          type="text"
          className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="$SCAN Airdrop #1"
        />
      </div>

      {/* Token */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token Symbol
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary"
            value={form.tokenSymbol}
            onChange={(e) =>
              setForm((f) => ({ ...f, tokenSymbol: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Token Address
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary font-mono text-xs"
            value={form.tokenAddress}
            onChange={(e) =>
              setForm((f) => ({ ...f, tokenAddress: e.target.value }))
            }
            placeholder="0x..."
          />
        </div>
      </div>

      {/* USDC & Recipients */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total USDC
          </label>
          <input
            type="number"
            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary"
            value={form.totalUsdc}
            onChange={(e) =>
              setForm((f) => ({ ...f, totalUsdc: e.target.value }))
            }
            placeholder="1000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reward Slots
          </label>
          <input
            type="number"
            min="1"
            max="500"
            className="w-full px-4 py-2 border border-border rounded-xl focus:ring-2 focus:ring-primary"
            value={form.maxRecipients}
            onChange={(e) => handleRecipientsChange(e.target.value)}
          />
        </div>
      </div>

      {/* Reward Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reward Structure
        </label>
        <div className="flex gap-4">
          <button
            className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition ${
              form.rewardType === "equal"
                ? "border-primary bg-blue-50 text-primary"
                : "border-border text-gray-500"
            }`}
            onClick={() => handleRewardTypeChange("equal")}
          >
            Equal Split
          </button>
          <button
            className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition ${
              form.rewardType === "tiered"
                ? "border-primary bg-blue-50 text-primary"
                : "border-border text-gray-500"
            }`}
            onClick={() => handleRewardTypeChange("tiered")}
          >
            Tiered
          </button>
        </div>
      </div>

      {/* Tier amounts */}
      {form.rewardType === "tiered" && form.tierAmounts.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount per slot (USDC)
          </label>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {form.tierAmounts.map((amount, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted w-8">#{i + 1}</span>
                <input
                  type="number"
                  className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                  value={amount}
                  onChange={(e) => updateTierAmount(i, e.target.value)}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">
            Total: ${tierSum.toLocaleString()} / $
            {parseFloat(form.totalUsdc || "0").toLocaleString()}
          </p>
        </div>
      )}

      {/* Eligibility Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Eligibility Rules
          </label>
          <button
            type="button"
            onClick={addRule}
            className="text-xs text-primary hover:underline"
          >
            + Add Rule
          </button>
        </div>
        {form.rules.map((rule, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_56px_auto_72px_auto] items-center gap-2 rounded-xl bg-surface-muted p-3"
          >
            <select
              className="min-w-0 rounded-lg border border-border bg-white px-2 py-1 text-sm"
              value={rule.type}
              onChange={(e) =>
                updateRule(
                  i,
                  "type",
                  e.target.value as EligibilityRule["type"]
                )
              }
            >
              <option value="puzzle_wins">Puzzle Wins</option>
              <option value="token_balance">Token Balance</option>
            </select>
            <input
              type="text"
              className="w-full rounded-lg border border-border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-center"
              value={rule.token}
              onChange={(e) => updateRule(i, "token", e.target.value)}
            />
            <span className="text-center text-xs text-muted">&ge;</span>
            <input
              type="number"
              className="w-full rounded-lg border border-border px-2 py-1 text-xs font-mono"
              value={rule.min}
              onChange={(e) =>
                updateRule(i, "min", parseInt(e.target.value) || 0)
              }
            />
            {form.rules.length > 1 && (
              <button
                type="button"
                onClick={() => removeRule(i)}
                aria-label="Delete rule"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-200 bg-white text-error transition hover:bg-red-50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h10M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 3v7m4-7v7M8 20h8a1 1 0 001-1V7H7v12a1 1 0 001 1z"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-error bg-red-50 p-3 rounded-xl">
          {error}
        </p>
      )}

      {claimUrl && (
        <div className="bg-green-50 p-4 rounded-xl space-y-2">
          <p className="text-sm font-medium text-green-800">
            Campaign created!
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={claimUrl}
              className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm font-mono"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(claimUrl)}
            >
              Copy
            </Button>
          </div>
          <p className="text-xs text-green-600">
            Add this URL to qrfy.com to generate your QR code
          </p>
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        loading={loading}
        onClick={handleSubmit}
        disabled={!form.name || !form.totalUsdc || !form.tokenAddress || !walletClient}
      >
        Create Campaign
      </Button>
    </Card>
  );
}
