"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { SlotCounter } from "./SlotCounter";
import { EligibilityChecks } from "./EligibilityChecks";
import { ClaimButton } from "./ClaimButton";
import { ClaimSuccess } from "./ClaimSuccess";
import { RecentClaimantsList } from "./RecentClaimantsList";
import { useClaimFlow } from "@/hooks/useClaimFlow";
import { useCampaignStatus } from "@/hooks/useCampaignStatus";
import { CampaignScanProgress } from "@/components/admin/CampaignScanProgress";
import type { ScanProgress } from "@/components/admin/CampaignScanProgress";
import type { CampaignData, EligibilityRule } from "@/types";

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
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
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
    submitClaim,
    recipientWallet,
    twitterHandle,
    scanHandle,
  } = useClaimFlow(campaign, platform);

  // Refresh slot counter immediately after a successful claim
  useEffect(() => {
    if (state === "CLAIMED_SUCCESS") refetchStatus();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const backUrl = `/claim/${campaignId}`;
  const platformLabel = platform === "farcaster" ? "Farcaster" : "X (Twitter)";
  const platformColor = platform === "farcaster" ? "bg-violet-600 hover:bg-violet-700" : "bg-gray-900 hover:bg-gray-800";
  const rules = (campaign?.eligibilityRules ?? []) as EligibilityRule[];
  const socialTaskRule = rules.find((r) => r.type === "social_task");
  const socialTaskPartnerName = socialTaskRule?.taskId ?? campaign?.name ?? null;
  // qrbase's progress endpoint now needs the token CA (from the token_balance rule).
  const partnerContractAddress =
    rules.find((r) => r.type === "token_balance")?.tokenAddress ?? "";
  const hasSocialTaskRule = Boolean(socialTaskRule);
  // Gate the claim button on task completion only when there's an explicit social_task rule
  const taskPassed =
    !hasSocialTaskRule ||
    !scanHandle ||
    !scanProgress ||
    scanProgress.campaignTasks.length === 0 ||
    scanProgress.campaignTasks.some((t) => t.completedByUser);

  // Single shared fetch — feeds both the left progress bar and the right task card.
  // Use scanHandle (Farcaster → fid, Twitter → username) — the Farcaster username
  // is NOT recognised by qrbase, so twitterHandle would return "not completed".
  useEffect(() => {
    if (!socialTaskPartnerName) return;
    const prefix = platform === "farcaster" ? "fc" : "x";
    const userId = scanHandle ? `${prefix}:${scanHandle}` : null;
    let url = `/api/scan-progress?partnerName=${encodeURIComponent(socialTaskPartnerName)}`;
    if (userId) url += `&userId=${encodeURIComponent(userId)}`;
    if (recipientWallet) url += `&walletAddress=${encodeURIComponent(recipientWallet)}`;
    if (partnerContractAddress) url += `&contractAddress=${encodeURIComponent(partnerContractAddress)}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => { if (res.success) setScanProgress(res.data); })
      .catch(() => null);
  }, [socialTaskPartnerName, scanHandle, recipientWallet, partnerContractAddress, platform]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-white border border-border rounded-2xl p-10 text-center max-w-md shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">Campaign not found</p>
          <p className="text-muted text-sm">This campaign may have been removed or the URL is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur-md">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { window.location.href = backUrl; }}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="QRbase" className="h-6 w-auto" />
              <span className="hidden sm:inline-flex items-center bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                Airdrop
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted uppercase tracking-wider hidden sm:block">Claiming via</span>
            <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full text-white ${platform === "farcaster" ? "bg-violet-600" : "bg-gray-800"}`}>
              {platformLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Body — 2 column on wide screens */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6 items-start">

          {/* Left column — Campaign info */}
          <div className="space-y-5">
            {campaign ? (
              <>
                {/* Campaign card */}
                <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-border">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mb-1">Active Campaign</p>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">{campaign.name}</h1>
                      </div>
                      <span className="flex-shrink-0 text-xs font-mono font-semibold bg-primary-light text-primary border border-border px-3 py-1 rounded-full">
                        ${campaign.tokenSymbol}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                    <div className="px-6 py-4 text-center">
                      <p className="text-2xl font-bold font-mono text-gray-900">{formatUsdc(campaign.totalUsdc)}</p>
                      <p className="text-xs text-muted mt-0.5">Prize Pool</p>
                    </div>
                    <div className="px-6 py-4 text-center">
                      <p className="text-2xl font-bold font-mono text-gray-900">{campaign.maxRecipients}</p>
                      <p className="text-xs text-muted mt-0.5">Reward Slots</p>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <SlotCounter status={status} />
                  </div>
                </div>

                {/* Recent claimants */}
                {status?.recentClaims && status.recentClaims.length > 0 && (
                  <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mb-4">Recent Claimants</p>
                    <RecentClaimantsList claims={status.recentClaims} />
                  </div>
                )}

                {/* ScanMode progress bar — always visible */}
                {socialTaskPartnerName && (
                  <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
                    <p className="text-xs font-mono font-semibold text-muted uppercase tracking-wider mb-3">ScanMode</p>
                    <CampaignScanProgress
                      partnerName={socialTaskPartnerName}
                      platform={platform}
                      variant="progress"
                      preloadedData={scanProgress}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Campaign skeleton loader */
              <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden animate-pulse">
                <div className="px-6 py-5 border-b border-border">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-6 bg-gray-100 rounded w-2/3" />
                </div>
                <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
                  <div className="px-6 py-4"><div className="h-8 bg-gray-100 rounded mb-1" /><div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" /></div>
                  <div className="px-6 py-4"><div className="h-8 bg-gray-100 rounded mb-1" /><div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" /></div>
                </div>
                <div className="px-6 py-4"><div className="h-4 bg-gray-100 rounded" /></div>
              </div>
            )}
          </div>

          {/* Right column — Auth / Claim flow */}
          <div className="lg:sticky lg:top-[61px]">
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
                    <div className="text-center space-y-5">
                      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">All slots claimed</h2>
                        <p className="text-sm text-muted">All {campaign?.maxRecipients} reward slots have been filled.</p>
                      </div>
                      <p className="text-sm text-muted">
                        Follow{" "}
                        <a href="https://twitter.com/QRbase_Bot" className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">
                          @QRbase_Bot
                        </a>{" "}
                        for the next campaign.
                      </p>
                    </div>
                  )}

                  {state === "CAMPAIGN_CLOSED" && (
                    <div className="text-center space-y-4">
                      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Campaign ended</h2>
                        <p className="text-muted text-sm">The campaign creator has closed this airdrop.</p>
                      </div>
                    </div>
                  )}

                  {state === "NOT_LOGGED_IN" && (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Check your eligibility</h2>
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
                          <img src="/farcasterIcon.svg" alt="Farcaster" className="w-4 h-4" />
                        )}
                        Sign in with {platformLabel}
                      </Button>
                    </div>
                  )}

                  {state === "CHECKING_ELIGIBILITY" && (
                    <div className="text-center space-y-4 py-6">
                      <div className="animate-spin h-8 w-8 border-[3px] border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-gray-700 font-medium text-sm">Checking your eligibility...</p>
                    </div>
                  )}

                  {state === "INELIGIBLE" && eligibility && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Not eligible yet</h2>
                        <p className="text-sm text-muted">You don&apos;t meet the requirements for this campaign.</p>
                      </div>
                      <div className="space-y-2">
                        <EligibilityChecks checks={eligibility.checks} />
                        {socialTaskPartnerName && (
                          <CampaignScanProgress
                            partnerName={socialTaskPartnerName}
                            userHandle={twitterHandle}
                            platform={platform}
                            variant="task-card"
                            preloadedData={scanProgress}
                          />
                        )}
                      </div>
                      <a
                        href="https://qrbase.xyz"
                        className="block text-center text-sm text-primary font-medium hover:underline"
                      >
                        Keep solving puzzles &rarr;
                      </a>
                    </div>
                  )}

                  {state === "ALREADY_CLAIMED" && (
                    <div className="text-center space-y-4">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                        <svg className="w-7 h-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Already claimed!</h2>
                        <p className="text-muted text-sm">Check your wallet for the USDC on Base.</p>
                      </div>
                    </div>
                  )}


                  {state === "ELIGIBLE_READY_TO_CLAIM" && eligibility && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                          </svg>
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">You&apos;re eligible!</h2>
                      </div>
                      <div className="space-y-2">
                        <EligibilityChecks checks={eligibility.checks} />
                        {socialTaskPartnerName && (
                          <CampaignScanProgress
                            partnerName={socialTaskPartnerName}
                            userHandle={twitterHandle}
                            platform={platform}
                            variant="task-card"
                            preloadedData={scanProgress}
                          />
                        )}
                      </div>
                      {recipientWallet && (
                        <div className="flex items-center justify-between bg-surface-muted border border-border rounded-xl px-4 py-2.5 text-sm">
                          <span className="text-muted text-xs">Wallet that will receive reward</span>
                          <span className="font-mono text-gray-700 text-xs">
                            {recipientWallet.slice(0, 6)}&hellip;{recipientWallet.slice(-4)}
                          </span>
                        </div>
                      )}
                      <ClaimButton
                        amount={eligibility.claimAmount || "0"}
                        slotPosition={(status?.claimedCount || 0) + 1}
                        loading={false}
                        disabled={!taskPassed}
                        onClaim={submitClaim}
                      />
                    </div>
                  )}

                  {state === "CLAIMING" && (
                    <div className="text-center space-y-4 py-6">
                      <div className="animate-spin h-8 w-8 border-[3px] border-primary border-t-transparent rounded-full mx-auto" />
                      <div>
                        <p className="text-gray-700 font-semibold text-sm">Processing your reward...</p>
                        <p className="text-xs text-muted mt-1">USDC is being sent on-chain, this may take a few seconds</p>
                      </div>
                    </div>
                  )}

                  {state === "CLAIMED_SUCCESS" && txHash && claimedAmount && (
                    <ClaimSuccess amount={claimedAmount} txHash={txHash} />
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <p className="text-center text-xs text-muted font-mono mt-5">
              Powered by{" "}
              <a href="https://qrbase.xyz" className="text-primary hover:underline">
                QRbase
              </a>{" "}
              &mdash; Built on Base
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
