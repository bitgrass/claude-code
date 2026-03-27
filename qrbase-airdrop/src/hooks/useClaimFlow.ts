"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useLoginWithOAuth, useWallets } from "@privy-io/react-auth";
import type { ClaimPageState, EligibilityResponse, CampaignData } from "@/types";

export function useClaimFlow(
  campaign: CampaignData | null,
  platform: "twitter" | "farcaster"
) {
  const { authenticated, user, login: privyLogin } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { wallets: privyWallets } = useWallets();

  // Privy wallet — used for eligibility balance check AND as reward recipient
  // Farcaster: verified ETH address → custody address → embedded wallet
  // Twitter: linked external wallet → embedded wallet
  const farcasterVerifiedAddress =
    (user?.farcaster as unknown as { verifiedAddresses?: { eth_addresses?: string[] } })
      ?.verifiedAddresses?.eth_addresses?.[0];

  // Twitter: user.wallet is Privy's direct primary wallet accessor (most reliable)
  // Falls back to linkedAccounts wallet search, then privyWallets (connected session)
  const twitterWallet =
    (user?.wallet as { address?: string } | undefined)?.address ||
    (user?.linkedAccounts?.find(
      (a) => a.type === "wallet" && "address" in a
    ) as { address: string } | undefined)?.address ||
    privyWallets[0]?.address ||
    "";

  const recipientWallet =
    platform === "farcaster"
      ? (farcasterVerifiedAddress ||
          (user?.farcaster as unknown as { ownerAddress?: string })?.ownerAddress ||
          privyWallets[0]?.address || "")
      : twitterWallet;

  const login = useCallback(() => {
    if (platform === "twitter") {
      initOAuth({ provider: "twitter" });
    } else {
      privyLogin();
    }
  }, [platform, initOAuth, privyLogin]);

  const [state, setState] = useState<ClaimPageState>("LOADING");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);
  // Resolved recipient: for Farcaster this comes from Neynar (primary verified address)
  const [resolvedRecipient, setResolvedRecipient] = useState<string | null>(null);

  const userId =
    platform === "farcaster"
      ? (user?.farcaster?.fid ? String(user.farcaster.fid) : "")
      : (user?.twitter?.subject || "");

  const userHandle =
    platform === "farcaster"
      ? ((user?.farcaster as unknown as { username?: string })?.username ||
          (user?.farcaster?.fid ? String(user.farcaster.fid) : ""))
      : (user?.twitter?.username || "");

  const isLoggedIn = authenticated;

  const checkEligibility = useCallback(async () => {
    if (!campaign || !isLoggedIn || !userId) return;

    setState("CHECKING_ELIGIBILITY");

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/eligibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eligibilityWallet: recipientWallet,
          walletAddress: recipientWallet,
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
        claimAmount: data.claimAmount,
        resolvedRecipient: data.resolvedRecipient,
      };
      setEligibility(eligibilityData);
      if (data.resolvedRecipient) setResolvedRecipient(data.resolvedRecipient);

      if (eligibilityData.reason === "already_claimed") {
        setState("ALREADY_CLAIMED");
      } else if (eligibilityData.eligible) {
        setState("ELIGIBLE_READY_TO_CLAIM");
      } else {
        setState("INELIGIBLE");
      }
    } catch {
      setState("INELIGIBLE");
      setEligibility({ eligible: false, checks: [], reason: "Failed to check eligibility. Please try again." });
    }
  }, [campaign, isLoggedIn, userId, userHandle, recipientWallet, platform]);

  useEffect(() => {
    if (campaign && authenticated) {
      checkEligibility();
    }
  }, [authenticated, campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  const determineState = useCallback((): ClaimPageState => {
    if (!campaign) return "LOADING";
    if (!campaign.isActive) {
      return campaign.claimedCount >= campaign.maxRecipients ? "CAMPAIGN_FULL" : "CAMPAIGN_CLOSED";
    }
    if (!isLoggedIn) return "NOT_LOGGED_IN";
    return state;
  }, [campaign, isLoggedIn, state]);

  const submitClaim = useCallback(async () => {
    if (!campaign || !userId || !recipientWallet) return;

    if (!recipientWallet) {
      setEligibility({ eligible: false, checks: [], reason: "No wallet linked to your account. Please link a wallet in your Privy account settings." });
      setState("INELIGIBLE");
      return;
    }

    setState("CLAIMING");

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/server-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterId: userId,
          twitterHandle: userHandle,
          recipientWallet,
          platform,
        }),
      });

      const data = await res.json() as { txHash?: string; claimAmount?: string; error?: string };

      if (!res.ok) {
        console.error("Claim failed:", data.error);
        setState("ELIGIBLE_READY_TO_CLAIM");
        return;
      }

      setTxHash(data.txHash || null);
      setClaimedAmount(data.claimAmount || eligibility?.claimAmount || "0");
      setState("CLAIMED_SUCCESS");
    } catch (err) {
      console.error("Claim error:", err);
      setState("ELIGIBLE_READY_TO_CLAIM");
    }
  }, [campaign, userId, userHandle, recipientWallet, platform, eligibility]);

  return {
    state: determineState(),
    eligibility,
    txHash,
    claimedAmount,
    login,
    checkEligibility,
    submitClaim,
    recipientWallet: resolvedRecipient || recipientWallet,
    twitterHandle: userHandle || null,
    twitterAvatar: platform === "twitter"
      ? (user?.twitter?.profilePictureUrl || null)
      : ((user?.farcaster as unknown as { pfp?: string })?.pfp || null),
  };
}
