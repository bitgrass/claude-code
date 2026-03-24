"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SlotCounter } from "./SlotCounter";
import { EligibilityChecks } from "./EligibilityChecks";
import { ClaimButton } from "./ClaimButton";
import { ClaimSuccess } from "./ClaimSuccess";
import { useClaimFlow } from "@/hooks/useClaimFlow";
import { useCampaignStatus } from "@/hooks/useCampaignStatus";
import type { CampaignData } from "@/types";

function formatUsdc(amount: string): string {
  return `$${(Number(amount) / 1e6).toLocaleString()}`;
}

export function ClaimPage({
  campaignId,
  platform,
}: {
  campaignId: string;
  platform: "twitter" | "farcaster";
}) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { status, refetch: refetchStatus } = useCampaignStatus(campaignId);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => { setCampaign(data.campaign); })
      .catch(() => setLoadError(true));
  }, [campaignId]);

  const {
    state,
    eligibility,
    txHash,
    claimedAmount,
    login,
    connectWallet,
    checkEligibility,
    submitClaim,
    walletAddress,
    walletConnected,
  } = useClaimFlow(campaign, platform);

  // Suppress unused variable warning
  void checkEligibility;

  // Refresh slot counter immediately after a successful claim
  useEffect(() => {
    if (state === "CLAIMED_SUCCESS") refetchStatus();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const backUrl = `/claim/${campaignId}`;

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 qr-pattern">
        <div className="bg-white border border-border rounded-2xl p-8 text-center max-w-md shadow-sm">
          <p className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</p>
          <p className="text-muted text-sm">This campaign may have been removed or the URL is incorrect.</p>
        </div>
      </div>
    );
  }

  const platformLabel = platform === "farcaster" ? "Farcaster" : "X (Twitter)";
  const platformColor = platform === "farcaster" ? "bg-violet-600 hover:bg-violet-700" : "bg-gray-900 hover:bg-gray-800";

  return (
    <div className="min-h-screen qr-pattern">
      {/* Banner */}
      <div className="gradient-banner py-2.5 px-4 text-center">
        <p className="text-white text-xs font-mono font-medium tracking-wide">
          QRbase Airdrop &mdash; Claim your USDC reward on Base
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Back link */}
        <button
          onClick={() => { window.location.href = backUrl; }}
          className="text-sm text-muted hover:text-gray-900 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Platform badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted uppercase tracking-wider">Claiming via</span>
          <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full text-white ${platform === "farcaster" ? "bg-violet-600" : "bg-gray-800"}`}>
            {platformLabel}
          </span>
        </div>

        {/* Campaign info card */}
        {campaign && (
          <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{campaign.name}</h1>
                <span className="flex-shrink-0 text-xs font-mono font-semibold bg-primary-light text-primary border border-border px-2.5 py-1 rounded-full">
                  ${campaign.tokenSymbol}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-bold font-mono text-gray-900">{formatUsdc(campaign.totalUsdc)}</p>
                <p className="text-xs text-muted">Prize Pool</p>
              </div>
              <div className="px-5 py-3 text-center">
                <p className="text-xl font-bold font-mono text-gray-900">{campaign.maxRecipients}</p>
                <p className="text-xs text-muted">Reward Slots</p>
              </div>
            </div>
            <div className="px-5 pb-4">
              <SlotCounter status={status} />
            </div>
          </div>
        )}

        {/* State-based content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              {state === "LOADING" && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-11 bg-gray-100 rounded-xl w-full mt-2" />
                </div>
              )}

              {state === "CAMPAIGN_FULL" && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">&#128532;</div>
                  <h2 className="text-xl font-bold text-gray-900">
                    All {campaign?.maxRecipients} rewards claimed
                  </h2>
                  {status?.recentClaims && status.recentClaims.length > 0 && (
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider">Winners</p>
                      {status.recentClaims.map((claim, i) => (
                        <div key={i} className="flex justify-between text-sm bg-primary-light border border-border rounded-xl p-2.5">
                          <span className="text-gray-700">@{claim.handle}</span>
                          <span className="font-mono font-semibold text-primary">{formatUsdc(claim.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted">
                    Follow{" "}
                    <a href="https://twitter.com/QRbase_Bot" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      @QRbase_Bot
                    </a>{" "}
                    for the next campaign
                  </p>
                </div>
              )}

              {state === "CAMPAIGN_CLOSED" && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">&#128274;</div>
                  <h2 className="text-xl font-bold text-gray-900">This campaign has ended</h2>
                  <p className="text-muted text-sm">The campaign creator has closed this airdrop.</p>
                </div>
              )}

              {state === "NOT_LOGGED_IN" && (
                <div className="text-center space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Check your eligibility</h2>
                    <p className="text-sm text-muted">Sign in to verify your puzzle wins and $SCAN balance.</p>
                  </div>
                  <Button
                    size="lg"
                    className={`w-full flex items-center justify-center gap-2 rounded-xl text-white ${platformColor}`}
                    onClick={login}
                  >
                    {platform === "twitter" ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 1000 1000" fill="currentColor">
                        <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
                        <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
                        <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
                      </svg>
                    )}
                    Sign in with {platformLabel}
                  </Button>
                </div>
              )}

              {state === "CHECKING_ELIGIBILITY" && (
                <div className="text-center space-y-4 py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-700 font-medium text-sm">Checking your eligibility...</p>
                </div>
              )}

              {state === "INELIGIBLE" && eligibility && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Not eligible yet</h2>
                  <EligibilityChecks checks={eligibility.checks} />
                  <p className="text-sm text-muted text-center">
                    Keep solving puzzles to qualify!{" "}
                    <a href="https://qrbase.xyz" className="text-primary hover:underline">
                      Go to QRbase &rarr;
                    </a>
                  </p>
                </div>
              )}

              {state === "ALREADY_CLAIMED" && (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Already claimed!</h2>
                  <p className="text-muted text-sm">Check your wallet for the USDC.</p>
                </div>
              )}

              {state === "ELIGIBLE_NEED_WALLET" && eligibility && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">You&apos;re eligible!</h2>
                    <p className="text-sm text-muted mt-1">Connect a wallet to receive your USDC reward.</p>
                  </div>
                  <EligibilityChecks checks={eligibility.checks} />
                  <div className="bg-primary-light border border-border rounded-xl p-3 text-xs text-muted text-center">
                    This wallet is for claiming only — separate from your {platformLabel} identity.
                  </div>
                  {walletConnected && walletAddress ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-surface-muted border border-border rounded-xl px-4 py-3 text-sm">
                        <span className="text-muted">Connected</span>
                        <span className="font-mono text-gray-700">
                          {walletAddress.slice(0, 6)}&hellip;{walletAddress.slice(-4)}
                        </span>
                      </div>
                      <Button size="lg" className="w-full rounded-xl" onClick={connectWallet}>
                        Change Wallet
                      </Button>
                    </div>
                  ) : (
                    <Button size="lg" className="w-full rounded-xl" onClick={connectWallet}>
                      Connect Wallet
                    </Button>
                  )}
                </div>
              )}

              {state === "ELIGIBLE_READY_TO_CLAIM" && eligibility && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">You&apos;re eligible!</h2>
                  </div>
                  <EligibilityChecks checks={eligibility.checks} />
                  {walletAddress && (
                    <div className="flex items-center justify-between bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm">
                      <span className="text-muted text-xs">Claiming to</span>
                      <span className="font-mono text-gray-700">
                        {walletAddress.slice(0, 6)}&hellip;{walletAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                  <ClaimButton
                    amount={eligibility.claimAmount || "0"}
                    slotPosition={(status?.claimedCount || 0) + 1}
                    loading={false}
                    onClaim={submitClaim}
                  />
                </div>
              )}

              {state === "CLAIMING" && (
                <div className="text-center space-y-4 py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-700 font-medium text-sm">Sending USDC to your wallet...</p>
                  <p className="text-xs text-muted">Please confirm in your wallet</p>
                </div>
              )}

              {state === "CLAIMED_SUCCESS" && txHash && claimedAmount && (
                <ClaimSuccess amount={claimedAmount} txHash={txHash} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="text-center text-xs text-muted pb-6 font-mono">
          Powered by{" "}
          <a href="https://qrbase.xyz" className="text-primary hover:underline">
            QRbase
          </a>{" "}
          on Base
        </div>
      </div>
    </div>
  );
}
