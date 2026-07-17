"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePrivy, useLoginWithOAuth, useWallets } from "@privy-io/react-auth";
import type { ClaimPageState, EligibilityResponse, CampaignData } from "@/types";

type PrivyWalletLike = {
  type?: string;
  address?: string;
  chainType?: string;
  walletClientType?: string;
};

function isEmbeddedEthereumWallet(wallet?: PrivyWalletLike): wallet is PrivyWalletLike & { address: string } {
  return Boolean(
    wallet?.address &&
      wallet.walletClientType === "privy" &&
      (!wallet.chainType || wallet.chainType === "ethereum")
  );
}

export function useClaimFlow(
  campaign: CampaignData | null,
  platform: "twitter" | "farcaster"
) {
  const { ready, authenticated, user, login: privyLogin } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { wallets: privyWallets } = useWallets();

  // Privy wallet - used for eligibility balance check AND as reward recipient.
  // Twitter claims use the existing embedded Privy wallet, not external linked wallets.
  const farcasterVerifiedAddress =
    (user?.farcaster as unknown as { verifiedAddresses?: { eth_addresses?: string[] } })
      ?.verifiedAddresses?.eth_addresses?.[0];

  // Read the existing embedded Privy wallet; do not fall back to external linked wallets.
  const embeddedPrivyWallet =
    (user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && isEmbeddedEthereumWallet(account as PrivyWalletLike)
    ) as PrivyWalletLike | undefined)?.address ||
    (isEmbeddedEthereumWallet(user?.wallet as PrivyWalletLike | undefined)
      ? (user?.wallet as PrivyWalletLike).address
      : undefined) ||
    privyWallets.find((wallet) => isEmbeddedEthereumWallet(wallet as PrivyWalletLike))?.address ||
    "";

  const recipientWallet =
    platform === "farcaster"
      ? (farcasterVerifiedAddress ||
          (user?.farcaster as unknown as { ownerAddress?: string })?.ownerAddress ||
          embeddedPrivyWallet)
      : embeddedPrivyWallet;

  // Privy embedded Solana wallet — used to check Solana (SPL) partner-token
  // holds for X users (Farcaster users are resolved server-side via Neynar).
  const embeddedSolanaWallet =
    ((user?.linkedAccounts?.find(
      (account) =>
        account.type === "wallet" &&
        (account as PrivyWalletLike).chainType === "solana"
    ) as PrivyWalletLike | undefined)?.address) ||
    privyWallets.find((wallet) => (wallet as PrivyWalletLike).chainType === "solana")?.address ||
    "";

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
  // Tracks which userId has been checked — prevents double-firing on wallet hydration
  // and ensures eligibility re-runs when the user switches Twitter accounts
  const eligibilityCheckedRef = useRef<string | null>(null);

  const userId =
    platform === "farcaster"
      ? (user?.farcaster?.fid ? String(user.farcaster.fid) : "")
      : (user?.twitter?.subject || "");

  const userHandle =
    platform === "farcaster"
      ? ((user?.farcaster as unknown as { username?: string })?.username ||
          (user?.farcaster?.fid ? String(user.farcaster.fid) : ""))
      : (user?.twitter?.username || "");

  // The identifier qrbase keys game/task data off: Farcaster → fid (fc:<fid>),
  // Twitter → username (x:<username>). Same logic the eligibility check uses.
  // NOTE: the Farcaster *username* is NOT recognised by qrbase — must be the fid.
  const scanHandle = platform === "farcaster" ? userId : userHandle;

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
          solanaWallet: embeddedSolanaWallet,
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
  }, [campaign, isLoggedIn, userId, userHandle, recipientWallet, embeddedSolanaWallet, platform]);

  useEffect(() => {
    if (!ready || !campaign || !authenticated || !userId) {
      eligibilityCheckedRef.current = null;
      return;
    }
    // Always run the check as soon as we know the user — never short-circuit on a
    // missing wallet. The wins/level rules resolve from the handle alone, so this
    // renders every requirement card immediately; only the balance rule depends on
    // a wallet. Privy hydrates wallets a tick after auth, so we key the "already
    // checked" ref on the wallets too and re-check once they land — that replaces
    // the old wait (which left checks empty and showed no cards at all).
    const checkKey = `${userId}:${recipientWallet}:${embeddedSolanaWallet}`;
    // User switched accounts — clear stale data before re-checking
    if (
      eligibilityCheckedRef.current !== null &&
      !eligibilityCheckedRef.current.startsWith(`${userId}:`)
    ) {
      setEligibility(null);
      setState("LOADING");
      setResolvedRecipient(null);
    }
    if (eligibilityCheckedRef.current === checkKey) return; // already checked for this user+wallets
    eligibilityCheckedRef.current = checkKey;
    checkEligibility();
  }, [ready, authenticated, campaign, recipientWallet, embeddedSolanaWallet, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const determineState = useCallback((): ClaimPageState => {
    if (!campaign) return "LOADING";
    if (!campaign.isActive) {
      return campaign.claimedCount >= campaign.maxRecipients ? "CAMPAIGN_FULL" : "CAMPAIGN_CLOSED";
    }
    if (!isLoggedIn) return "NOT_LOGGED_IN";
    return state;
  }, [campaign, isLoggedIn, state]);

  const submitClaim = useCallback(async () => {
    if (!campaign || !userId) return;

    if (!recipientWallet) {
      setEligibility({ eligible: false, checks: [], reason: "No embedded Privy wallet found for your account." });
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
          solanaWallet: embeddedSolanaWallet,
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
    scanHandle: scanHandle || null,
    twitterAvatar: platform === "twitter"
      ? (user?.twitter?.profilePictureUrl || null)
      : ((user?.farcaster as unknown as { pfp?: string })?.pfp || null),
  };
}
