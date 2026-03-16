"use client";

import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type {
  ClaimPageState,
  EligibilityResponse,
  CampaignData,
} from "@/types";

export function useClaimFlow(campaign: CampaignData | null) {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();

  const [state, setState] = useState<ClaimPageState>("LOADING");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(
    null
  );
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);

  const wallet = wallets[0];
  const walletAddress = wallet?.address;

  const determineState = useCallback((): ClaimPageState => {
    if (!campaign) return "LOADING";
    if (!campaign.isActive) {
      return campaign.claimedCount >= campaign.maxRecipients
        ? "CAMPAIGN_FULL"
        : "CAMPAIGN_CLOSED";
    }
    if (!authenticated) return "NOT_LOGGED_IN";
    if (!walletAddress) return "LOGGED_IN_NO_WALLET";
    return state;
  }, [campaign, authenticated, walletAddress, state]);

  const checkEligibility = useCallback(async () => {
    if (!campaign || !walletAddress) return;

    setState("CHECKING_ELIGIBILITY");

    try {
      const twitterId = user?.twitter?.subject || "";
      const twitterHandle = user?.twitter?.username || "";
      const res = await fetch(`/api/campaigns/${campaign.id}/eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, twitterId, twitterHandle }),
      });

      const data: EligibilityResponse = await res.json();
      setEligibility(data);

      if (data.reason === "already_claimed") {
        setState("ALREADY_CLAIMED");
      } else if (data.eligible) {
        setState("ELIGIBLE_READY_TO_CLAIM");
      } else {
        setState("INELIGIBLE");
      }
    } catch {
      setState("INELIGIBLE");
      setEligibility({
        eligible: false,
        checks: [],
        reason: "Failed to check eligibility. Please try again.",
      });
    }
  }, [campaign, walletAddress, user]);

  const submitClaim = useCallback(async () => {
    if (!campaign || !walletAddress || !eligibility?.signedAuth || !wallet) return;

    setState("CLAIMING");

    try {
      const provider = await wallet.getEthereumProvider();
      const { encodeFunctionData } = await import("viem");
      const { QRBASE_AIRDROP_ABI } = await import("@/lib/contract");

      const twitterId = user?.twitter?.subject || "";

      const data = encodeFunctionData({
        abi: QRBASE_AIRDROP_ABI,
        functionName: "claimReward",
        args: [
          BigInt(campaign.onChainId),
          twitterId,
          eligibility.signedAuth as `0x${string}`,
        ],
      });

      const contractAddress = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "";

      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: contractAddress,
            data,
          },
        ],
      });

      setTxHash(hash as string);
      setClaimedAmount(eligibility.claimAmount || "0");

      // Record claim in DB
      await fetch(`/api/campaigns/${campaign.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          txHash: hash,
          twitterId,
          twitterHandle: user?.twitter?.username || "unknown",
        }),
      });

      setState("CLAIMED_SUCCESS");
    } catch (err) {
      console.error("Claim failed:", err);
      setState("ELIGIBLE_READY_TO_CLAIM");
    }
  }, [campaign, walletAddress, eligibility, wallet, user]);

  return {
    state: determineState() === "LOADING" && state !== "LOADING" ? state : determineState(),
    eligibility,
    txHash,
    claimedAmount,
    login,
    checkEligibility,
    submitClaim,
    walletAddress,
    twitterHandle: user?.twitter?.username || null,
    twitterAvatar: user?.twitter?.profilePictureUrl || null,
  };
}
