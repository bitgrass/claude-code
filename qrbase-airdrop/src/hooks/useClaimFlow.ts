"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type {
  ClaimPageState,
  EligibilityResponse,
  CampaignData,
} from "@/types";
import type { FarcasterIdentity } from "@/components/claim/FarcasterAuthSection";

export function useClaimFlow(
  campaign: CampaignData | null,
  farcasterIdentity?: FarcasterIdentity | null
) {
  const { authenticated, user, login } = usePrivy();
  const { wallets } = useWallets();

  const [state, setState] = useState<ClaimPageState>("LOADING");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);

  const wallet = wallets[0];
  const walletAddress = wallet?.address || user?.wallet?.address;

  // Resolve which platform/identity to use
  const platform = farcasterIdentity?.fid ? "farcaster" : "twitter";
  const userId = platform === "farcaster"
    ? farcasterIdentity!.fid
    : (user?.twitter?.subject || "");
  // For QRbase API: Twitter uses handle, Farcaster uses FID (e.g. fc:1005896)
  const userHandle = platform === "farcaster"
    ? farcasterIdentity!.fid
    : (user?.twitter?.username || "");

  const isLoggedIn = authenticated || !!farcasterIdentity?.fid;

  // Eligibility check — wallet is optional (needed only for token_balance rules)
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

  // Auto-check eligibility once authenticated (Twitter)
  useEffect(() => {
    if (campaign && authenticated) {
      checkEligibility();
    }
  }, [authenticated, campaign]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-check eligibility once Farcaster identity arrives
  useEffect(() => {
    if (campaign && farcasterIdentity?.fid) {
      checkEligibility();
    }
  }, [farcasterIdentity?.fid, campaign]);  // eslint-disable-line react-hooks/exhaustive-deps

  // When wallet connects and user is eligible, upgrade state
  useEffect(() => {
    if (walletAddress && state === "ELIGIBLE_NEED_WALLET") {
      setState("ELIGIBLE_READY_TO_CLAIM");
    }
  }, [walletAddress, state]);

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
      const { encodeFunctionData } = await import("viem");
      const { QRBASE_AIRDROP_ABI } = await import("@/lib/contract");

      const data = encodeFunctionData({
        abi: QRBASE_AIRDROP_ABI,
        functionName: "claimReward",
        args: [
          BigInt(campaign.onChainId),
          userId,
          eligibility.signedAuth as `0x${string}`,
        ],
      });

      const contractAddress = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "";

      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: walletAddress, to: contractAddress, data }],
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
    checkEligibility,
    submitClaim,
    walletAddress,
    twitterHandle: userHandle || null,
    twitterAvatar: user?.twitter?.profilePictureUrl || null,
  };
}
