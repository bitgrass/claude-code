"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type {
  ClaimPageState,
  EligibilityResponse,
  CampaignData,
} from "@/types";

export function useClaimFlow(
  campaign: CampaignData | null,
  platform: "twitter" | "farcaster"
) {
  const { authenticated, user, login, connectWallet } = usePrivy();
  const { wallets } = useWallets();

  const [state, setState] = useState<ClaimPageState>("LOADING");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);

  const wallet = wallets[0];
  const walletAddress = wallet?.address || user?.wallet?.address;

  const userId =
    platform === "farcaster"
      ? user?.farcaster?.fid ? String(user.farcaster.fid) : ""
      : user?.twitter?.subject || "";

  const userHandle =
    platform === "farcaster"
      ? user?.farcaster?.fid ? String(user.farcaster.fid) : ""
      : user?.twitter?.username || "";

  const isLoggedIn = authenticated;

  const checkEligibility = useCallback(async () => {
    if (!campaign || !isLoggedIn) return;

    if (!userId) {
      setState("INELIGIBLE");
      setEligibility({ eligible: false, checks: [], reason: "Account not linked to your session." });
      return;
    }

    setState("CHECKING_ELIGIBILITY");

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: walletAddress || "",
          twitterId: userId,
          twitterHandle: userHandle,
          platform,
        }),
      });

      const data = await res.json() as Partial<EligibilityResponse> & { error?: string };

      if (!res.ok) {
        setState("INELIGIBLE");
        setEligibility({ eligible: false, checks: [], reason: data.error || "Failed to check eligibility." });
        return;
      }

      const eligibilityData: EligibilityResponse = {
        eligible: data.eligible ?? false,
        checks: data.checks ?? [],
        reason: data.reason,
        signedAuth: data.signedAuth,
        claimAmount: data.claimAmount,
      };
      setEligibility(eligibilityData);

      if (eligibilityData.reason === "already_claimed") {
        setState("ALREADY_CLAIMED");
      } else if (eligibilityData.eligible) {
        setState(walletAddress ? "ELIGIBLE_READY_TO_CLAIM" : "ELIGIBLE_NEED_WALLET");
      } else {
        setState("INELIGIBLE");
      }
    } catch {
      setState("INELIGIBLE");
      setEligibility({ eligible: false, checks: [], reason: "Failed to check eligibility. Please try again." });
    }
  }, [campaign, isLoggedIn, walletAddress, userId, userHandle, platform]);

  // Auto-check eligibility once authenticated (covers both Twitter and Farcaster)
  useEffect(() => {
    if (campaign && authenticated) {
      checkEligibility();
    }
  }, [authenticated, campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  // When wallet address becomes available and we don't have a signed auth yet, re-check
  useEffect(() => {
    if (walletAddress && isLoggedIn && !eligibility?.signedAuth) {
      checkEligibility();
    }
  }, [walletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  const determineState = useCallback((): ClaimPageState => {
    if (!campaign) return "LOADING";
    if (!campaign.isActive) {
      return campaign.claimedCount >= campaign.maxRecipients
        ? "CAMPAIGN_FULL"
        : "CAMPAIGN_CLOSED";
    }
    if (!isLoggedIn) return "NOT_LOGGED_IN";
    return state;
  }, [campaign, isLoggedIn, state]);

  const submitClaim = useCallback(async () => {
    if (!campaign || !walletAddress || !eligibility?.signedAuth || !wallet) return;

    setState("CLAIMING");

    try {
      const provider = await wallet.getEthereumProvider();
      const { createPublicClient, createWalletClient, custom, http } = await import("viem");
      const { base } = await import("viem/chains");
      const { QRBASE_AIRDROP_ABI } = await import("@/lib/contract");

      const contractAddress = (process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "") as `0x${string}`;
      const claimArgs = [
        BigInt(campaign.onChainId),
        userId,
        eligibility.signedAuth as `0x${string}`,
      ] as const;

      const publicClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi: QRBASE_AIRDROP_ABI,
        functionName: "claimReward",
        args: claimArgs,
        account: walletAddress as `0x${string}`,
      });

      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: base,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: QRBASE_AIRDROP_ABI,
        functionName: "claimReward",
        args: claimArgs,
        gas: gasEstimate,
      });

      setTxHash(hash as string);
      setClaimedAmount(eligibility.claimAmount || "0");

      await fetch(`/api/campaigns/${campaign.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          txHash: hash,
          twitterId: userId,
          twitterHandle: userHandle,
        }),
      });

      setState("CLAIMED_SUCCESS");
    } catch (err) {
      console.error("Claim failed:", err);
      setState("ELIGIBLE_READY_TO_CLAIM");
    }
  }, [campaign, walletAddress, eligibility, wallet, userId, userHandle]);

  return {
    state: determineState(),
    eligibility,
    txHash,
    claimedAmount,
    login,
    connectWallet,
    checkEligibility,
    submitClaim,
    walletAddress,
    twitterHandle: userHandle || null,
    twitterAvatar: platform === "twitter" ? (user?.twitter?.profilePictureUrl || null) : null,
  };
}
