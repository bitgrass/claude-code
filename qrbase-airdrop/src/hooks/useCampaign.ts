"use client";

import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI } from "@/lib/contract";

export function useCampaign(campaignId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: QRBASE_AIRDROP_ABI,
    functionName: "getCampaign",
    args: [BigInt(campaignId)],
  });

  return {
    campaign: data,
    isLoading,
    error,
    refetch,
  };
}

export function useClaimStatus(campaignId: number, wallet: `0x${string}` | undefined) {
  const { data, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: QRBASE_AIRDROP_ABI,
    functionName: "getClaimStatus",
    args: wallet ? [BigInt(campaignId), wallet] : undefined,
    query: { enabled: !!wallet },
  });

  return { hasClaimed: data as boolean | undefined, isLoading };
}
