"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { waitForTransactionReceipt } from "@wagmi/core";
import { useAuth } from "@/contexts/AuthContext";
import type { ItemInventory, StoreItem } from "@/lib/items";
import { wagmiConfig } from "@/lib/wagmi";

const BASE_CHAIN_ID_NUM = 8453;

const EMPTY_INVENTORY: ItemInventory = {
  spell_frost: 0,
  shield_guard: 0,
};

type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type ClaimPrepareResponse = {
  tx: {
    to: string;
    data: string;
    value: string;
    chainId: number;
  };
  approval?: {
    required: boolean;
    tokenAddress: string;
    spender: string;
    amount: string;
  };
};

export default function StorePage() {
  const router = useRouter();
  const { identity } = useAuth();
  const { wallets } = useWallets();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<ItemInventory>(EMPTY_INVENTORY);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyingStage, setBuyingStage] = useState<"wallet" | "approve" | "chain" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items/catalog")
      .then((r) => r.json())
      .then((data) => setItems((data.items ?? []) as StoreItem[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!identity) return;
    setLoading(true);
    const params = new URLSearchParams({
      handle: identity.handle,
      platform: identity.platform,
      sync: "1",
    });
    if (identity.walletAddress) params.set("walletAddress", identity.walletAddress);
    fetch(`/api/items/inventory?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.inventory) setInventory({ ...EMPTY_INVENTORY, ...data.inventory });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [identity]);

  /** Resolve the right EIP-1193 provider using Privy wallet data */
  const resolveProvider = async (): Promise<{ provider: EIP1193Provider; from: string }> => {
    const preferredAddress = identity?.walletAddress?.toLowerCase();
    const embeddedWallet =
      wallets.find(
        (w) =>
          (w as any).walletClientType === "privy" &&
          (preferredAddress ? w.address.toLowerCase() === preferredAddress : true)
      ) ?? wallets.find((w) => (w as any).walletClientType === "privy");

    const activeWallet =
      embeddedWallet ??
      wallets.find((w) => (preferredAddress ? w.address.toLowerCase() === preferredAddress : false)) ??
      wallets[0];

    if (!activeWallet) {
      throw new Error("No Privy wallet found. Reconnect and try again.");
    }

    await activeWallet.switchChain(BASE_CHAIN_ID_NUM);
    const provider = await activeWallet.getEthereumProvider();
    return { provider: provider as EIP1193Provider, from: activeWallet.address };
  };

  const buyItem = async (item: StoreItem) => {
    if (!identity || buying) return;
    setError(null);
    setBuying(item.id);
    setBuyingStage("wallet");

    try {
      const { provider, from } = await resolveProvider();

      const prepRes = await fetch("/api/items/claim/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, walletAddress: from, quantity: 1 }),
      });
      const prep = (await prepRes.json().catch(() => ({}))) as Partial<ClaimPrepareResponse> & { error?: string };
      if (!prepRes.ok) throw new Error(prep.error ?? "Failed to prepare transaction");
      if (!prep.tx) throw new Error("Missing prepared transaction payload");

      const web3Provider = new ethers.providers.Web3Provider(provider as any, "any");
      const signer = web3Provider.getSigner(from);

      if (prep.approval?.required) {
        setBuyingStage("approve");
        const erc20 = new ethers.Contract(
          prep.approval.tokenAddress,
          [
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address account) view returns (uint256)",
            "function approve(address spender, uint256 value) returns (bool)",
          ],
          signer
        );

        const requiredAmount = ethers.BigNumber.from(prep.approval.amount);
        const [allowance, balance] = await Promise.all([
          erc20.allowance(from, prep.approval.spender) as Promise<ethers.BigNumber>,
          erc20.balanceOf(from) as Promise<ethers.BigNumber>,
        ]);

        if (balance.lt(requiredAmount)) {
          throw new Error("Not enough token balance for this claim.");
        }

        if (allowance.lt(requiredAmount)) {
          const approveTx = await erc20.approve(prep.approval.spender, ethers.constants.MaxUint256);
          const approveReceipt = await waitForTransactionReceipt(wagmiConfig, {
            chainId: BASE_CHAIN_ID_NUM,
            hash: approveTx.hash as `0x${string}`,
            confirmations: 1,
          });
          if (approveReceipt.status !== "success") {
            throw new Error("Approve transaction failed");
          }
        }
      }

      setBuyingStage("wallet");
      const txResponse = await signer.sendTransaction({
        to: prep.tx.to,
        data: prep.tx.data,
        value: prep.tx.value,
      });

      setBuyingStage("chain");
      const receipt = await waitForTransactionReceipt(wagmiConfig, {
        chainId: BASE_CHAIN_ID_NUM,
        hash: txResponse.hash as `0x${string}`,
        confirmations: 1,
      });
      if (receipt.status !== "success") {
        throw new Error("Claim transaction reverted");
      }

      setInventory((prev) => ({
        ...prev,
        [item.id]: prev[item.id] + 1,
      }));

      const syncRes = await fetch("/api/items/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: identity.handle,
          platform: identity.platform,
          itemId: item.id,
          walletAddress: from,
        }),
      });
      const syncData = await syncRes.json().catch(() => ({}));
      if (syncData.inventory) setInventory({ ...EMPTY_INVENTORY, ...syncData.inventory });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBuying(null);
      setBuyingStage(null);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--app-bg)", color: "var(--text-main)" }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-black"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #10B981)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Arcane Store
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(var(--fg-rgb),0.6)" }}>
              Claim directly in-app with your Privy embedded wallet.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "rgba(var(--fg-rgb),0.08)", border: "1px solid rgba(var(--fg-rgb),0.14)" }}
          >
            Home
          </button>
        </div>

        {!identity ? (
          <div
            className="rounded-2xl p-4 text-sm"
            style={{ background: "rgba(var(--fg-rgb),0.05)", border: "1px solid rgba(var(--fg-rgb),0.12)" }}
          >
            Sign in first to buy and manage your items.
          </div>
        ) : (
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(var(--fg-rgb),0.05)", border: "1px solid rgba(var(--fg-rgb),0.12)" }}
          >
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: "rgba(var(--fg-rgb),0.5)" }}>
              Inventory @{identity.handle}
            </p>
            {loading ? (
              <p className="text-sm" style={{ color: "rgba(var(--fg-rgb),0.65)" }}>
                Loading inventory...
              </p>
            ) : (
              <div className="flex gap-3">
                <div
                  className="px-3 py-2 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.45)" }}
                >
                  Frost Hex: <b>{inventory.spell_frost}</b>
                </div>
                <div
                  className="px-3 py-2 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.45)" }}
                >
                  Aegis Shield: <b>{inventory.shield_guard}</b>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-3 py-2 text-sm"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.45)" }}
          >
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: "rgba(var(--fg-rgb),0.04)", border: "1px solid rgba(var(--fg-rgb),0.12)" }}
            >
              <div
                className="w-full aspect-[4/3] rounded-xl overflow-hidden"
                style={{ background: "rgba(var(--fg-rgb),0.04)", border: "1px solid rgba(var(--fg-rgb),0.1)" }}
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={`${item.metadataName ?? item.name} artwork`}
                    width={640}
                    height={480}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    {item.kind === "spell" ? "Spell" : "Shield"}
                  </div>
                )}
              </div>

              <div>
                <p className="text-lg font-black">
                  {item.kind === "spell" ? "Spell" : "Shield"} {item.name}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(var(--fg-rgb),0.8)" }}>
                  {item.description}
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(var(--fg-rgb),0.55)" }}>
                  {item.effectSummary}
                </p>
                {item.nftContract && (
                  <p className="text-[11px] mt-2 font-mono" style={{ color: "rgba(var(--fg-rgb),0.45)" }}>
                    {item.nftContract.slice(0, 8)}... / Token #{item.nftTokenId}
                  </p>
                )}
                {identity && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "rgba(var(--fg-rgb),0.82)" }}>
                    Owned: {inventory[item.id]}
                  </p>
                )}
              </div>

              <button
                onClick={() => buyItem(item)}
                disabled={!identity || buying !== null}
                className="w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-45"
                style={{
                  background: item.kind === "spell" ? "rgba(59,130,246,0.28)" : "rgba(16,185,129,0.28)",
                  border: item.kind === "spell" ? "1px solid rgba(59,130,246,0.6)" : "1px solid rgba(16,185,129,0.6)",
                }}
              >
                {buying === item.id
                  ? buyingStage === "approve"
                    ? "Approving token..."
                    : buyingStage === "chain"
                    ? "Confirming on-chain..."
                    : "Sending transaction..."
                  : "Claim x1"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

