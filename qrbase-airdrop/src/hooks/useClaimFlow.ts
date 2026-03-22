"use client";

import { useState, useCallback, useEffect } from "react";
import { usePrivy, useLoginWithOAuth, useWallets } from "@privy-io/react-auth";
import { useAccount, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type {
  ClaimPageState,
  EligibilityResponse,
  CampaignData,
} from "@/types";

export function useClaimFlow(
  campaign: CampaignData | null,
  platform: "twitter" | "farcaster"
) {
  // Privy: identity only (Twitter or Farcaster login for eligibility check)
  const { authenticated, user, login: privyLogin } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { wallets: privyWallets } = useWallets();

  // Privy wallet used for eligibility/balance checks (NOT for claiming)
  // Farcaster: Warpcast verified address (primary) → custody address → first Privy wallet
  // Twitter: first Privy-linked wallet if any
  const farcasterVerifiedAddress =
    (user?.farcaster as unknown as { verifiedAddresses?: { eth_addresses?: string[] } })
      ?.verifiedAddresses?.eth_addresses?.[0];
  const privyWalletAddress =
    platform === "farcaster"
      ? (farcasterVerifiedAddress || (user?.farcaster as unknown as { ownerAddress?: string })?.ownerAddress || privyWallets[0]?.address || "")
      : (privyWallets[0]?.address || "");

  // Wagmi + RainbowKit: independent wallet for claiming (never linked to Privy)
  const { address: walletAddress, isConnected: walletConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();

  // Redirect-based OAuth for Twitter (works on mobile); Farcaster uses QR/deeplink
  const login = useCallback(() => {
    if (platform === "twitter") {
      initOAuth({ provider: "twitter" });
    } else {
      privyLogin();
    }
  }, [platform, initOAuth, privyLogin]);

  // Opens RainbowKit wallet picker — user chooses any wallet, independent of Privy
  const connectWallet = useCallback(() => {
    openConnectModal?.();
  }, [openConnectModal]);

  const [state, setState] = useState<ClaimPageState>("LOADING");
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [eligibilityVerified, setEligibilityVerified] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<string | null>(null);

  // userId is the unique identifier sent to the contract and stored in DB
  const userId =
    platform === "farcaster"
      ? user?.farcaster?.fid ? String(user.farcaster.fid) : ""
      : user?.twitter?.subject || "";

  // userHandle is used for QRbase game status API lookup — uses FID for Farcaster (fc:{fid})
  const userHandle =
    platform === "farcaster"
      ? (user?.farcaster?.fid ? String(user.farcaster.fid) : "")
      : user?.twitter?.username || "";

  const isLoggedIn = authenticated;

  // Eligibility is checked ONCE after Privy login, using the Privy wallet for balance checks.
  // No re-check when the claiming wallet connects — signature is fetched at claim time.
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
          eligibilityWallet: privyWalletAddress, // Privy wallet — for balance check
          walletAddress: "",                      // No claim wallet at this stage
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
      };
      setEligibility(eligibilityData);

      if (eligibilityData.reason === "already_claimed") {
        setState("ALREADY_CLAIMED");
      } else if (eligibilityData.eligible) {
        setEligibilityVerified(true);
        // If claiming wallet already connected, go straight to ready; else prompt connect
        setState(walletAddress ? "ELIGIBLE_READY_TO_CLAIM" : "ELIGIBLE_NEED_WALLET");
      } else {
        setState("INELIGIBLE");
      }
    } catch {
      setState("INELIGIBLE");
      setEligibility({ eligible: false, checks: [], reason: "Failed to check eligibility. Please try again." });
    }
  }, [campaign, isLoggedIn, walletAddress, userId, userHandle, platform, privyWalletAddress]);

  // Auto-check eligibility once authenticated (single check, no re-check on wallet connect)
  useEffect(() => {
    if (campaign && authenticated) {
      checkEligibility();
    }
  }, [authenticated, campaign]); // eslint-disable-line react-hooks/exhaustive-deps

  // When RainbowKit wallet connects and eligibility already verified → move to ready to claim
  useEffect(() => {
    if (walletAddress && eligibilityVerified) {
      setState("ELIGIBLE_READY_TO_CLAIM");
    }
  }, [walletAddress, eligibilityVerified]);

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
    if (!campaign || !walletAddress || !eligibilityVerified) return;

    setState("CLAIMING");

    try {
      // Fetch signature at claim time — bound to the chosen claiming wallet
      const signRes = await fetch(`/api/campaigns/${campaign.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, twitterId: userId }),
      });

      const signData = await signRes.json() as { signedAuth?: string; claimAmount?: string; error?: string };

      if (!signRes.ok || !signData.signedAuth) {
        console.error("Sign failed:", signData.error);
        setState("ELIGIBLE_READY_TO_CLAIM");
        return;
      }

      const { QRBASE_AIRDROP_ABI } = await import("@/lib/contract");
      const contractAddress = (process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "") as `0x${string}`;

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: QRBASE_AIRDROP_ABI,
        functionName: "claimReward",
        args: [BigInt(campaign.onChainId), userId, signData.signedAuth as `0x${string}`],
      });

      setTxHash(hash as string);
      setClaimedAmount(signData.claimAmount || eligibility?.claimAmount || "0");

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
  }, [campaign, walletAddress, eligibilityVerified, eligibility, userId, userHandle, writeContractAsync]);

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
    walletConnected,
    twitterHandle: userHandle || null,
    twitterAvatar: platform === "twitter" ? (user?.twitter?.profilePictureUrl || null) : null,
  };
}
