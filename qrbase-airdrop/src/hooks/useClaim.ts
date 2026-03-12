"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESS, QRBASE_AIRDROP_ABI } from "@/lib/contract";
import type { ClaimAuthorization } from "@/types";

export function useClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = async (auth: ClaimAuthorization) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: QRBASE_AIRDROP_ABI,
      functionName: "claimReward",
      args: [
        BigInt(auth.campaignId),
        auth.recipient as `0x${string}`,
        auth.twitterId,
        BigInt(auth.amount),
        auth.signature as `0x${string}`,
      ],
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
