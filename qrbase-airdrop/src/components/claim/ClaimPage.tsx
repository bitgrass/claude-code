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

export function ClaimPage({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const { status } = useCampaignStatus(campaignId);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => setCampaign(data.campaign))
      .catch(() => setLoadError(true));
  }, [campaignId]);

  const {
    state,
    eligibility,
    txHash,
    claimedAmount,
    login,
    checkEligibility,
    submitClaim,
    walletAddress,
    twitterHandle,
  } = useClaimFlow(campaign);

  // Auto-trigger eligibility check
  useEffect(() => {
    if (
      state === "LOGGED_IN_NO_WALLET" &&
      walletAddress
    ) {
      checkEligibility();
    }
  }, [state, walletAddress, checkEligibility]);

  useEffect(() => {
    if (
      campaign &&
      walletAddress &&
      (state === "NOT_LOGGED_IN" || state === "LOGGED_IN_NO_WALLET")
    ) {
      checkEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 qr-pattern">
        <Card className="p-8 text-center max-w-md">
          <p className="text-xl font-semibold text-gray-900 mb-2">
            Campaign not found
          </p>
          <p className="text-muted">
            This campaign may have been removed or the URL is incorrect.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen qr-pattern">
      {/* Header banner */}
      <div className="gradient-banner py-3 px-4 text-center">
        <p className="text-white text-sm font-medium">
          QRbase Airdrop &mdash; Claim your USDC reward on Base
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Campaign info card */}
        {campaign && (
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                  {campaign.name}
                </h1>
                <span className="text-sm font-medium text-primary">
                  ${campaign.tokenSymbol}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-surface-muted rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatUsdc(campaign.totalUsdc)}
                  </p>
                  <p className="text-xs text-muted">Prize Pool</p>
                </div>
                <div className="bg-surface-muted rounded-xl p-3">
                  <p className="text-2xl font-bold text-gray-900">
                    {campaign.maxRecipients}
                  </p>
                  <p className="text-xs text-muted">Reward Slots</p>
                </div>
              </div>

              {/* Slot counter */}
              <SlotCounter status={status} />
            </div>
          </Card>
        )}

        {/* State-based content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6">
              {/* LOADING */}
              {state === "LOADING" && (
                <div className="space-y-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-12 bg-gray-200 rounded w-full" />
                </div>
              )}

              {/* CAMPAIGN_FULL */}
              {state === "CAMPAIGN_FULL" && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">&#128532;</div>
                  <h2 className="text-xl font-bold text-gray-900">
                    All {campaign?.maxRecipients} rewards have been claimed
                  </h2>
                  {status?.recentClaims && status.recentClaims.length > 0 && (
                    <div className="space-y-2 text-left">
                      <p className="text-sm font-medium text-gray-700">
                        Winners:
                      </p>
                      {status.recentClaims.map((claim, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm bg-surface-muted p-2 rounded-lg"
                        >
                          <span className="text-gray-700">
                            @{claim.handle}
                          </span>
                          <span className="font-medium text-gray-900">
                            {formatUsdc(claim.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted">
                    Follow{" "}
                    <a
                      href="https://twitter.com/QRbase_Bot"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @QRbase_Bot
                    </a>{" "}
                    to catch the next campaign
                  </p>
                </div>
              )}

              {/* CAMPAIGN_CLOSED */}
              {state === "CAMPAIGN_CLOSED" && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">&#128274;</div>
                  <h2 className="text-xl font-bold text-gray-900">
                    This campaign has ended
                  </h2>
                  <p className="text-muted">
                    The campaign creator has closed this airdrop.
                  </p>
                </div>
              )}

              {/* NOT_LOGGED_IN */}
              {state === "NOT_LOGGED_IN" && (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Check your eligibility
                  </h2>
                  <p className="text-muted">
                    Sign in with your X account to see if you qualify for this
                    reward.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={login}
                  >
                    Sign in with X
                  </Button>
                </div>
              )}

              {/* LOGGED_IN_NO_WALLET */}
              {state === "LOGGED_IN_NO_WALLET" && (
                <div className="text-center space-y-4">
                  {twitterHandle && (
                    <p className="text-sm text-muted">
                      Signed in as{" "}
                      <span className="font-medium text-gray-700">
                        @{twitterHandle}
                      </span>
                    </p>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">
                    Connect your Base wallet
                  </h2>
                  <p className="text-muted">
                    Connect or create a wallet to continue.
                  </p>
                  <Button size="lg" className="w-full" onClick={login}>
                    Connect Wallet
                  </Button>
                </div>
              )}

              {/* CHECKING_ELIGIBILITY */}
              {state === "CHECKING_ELIGIBILITY" && (
                <div className="text-center space-y-4 py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-700 font-medium">
                    Checking your eligibility...
                  </p>
                </div>
              )}

              {/* INELIGIBLE */}
              {state === "INELIGIBLE" && eligibility && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Not eligible yet
                  </h2>
                  <EligibilityChecks checks={eligibility.checks} />
                  <p className="text-sm text-muted text-center">
                    Keep solving puzzles to qualify!{" "}
                    <a
                      href="https://qrbase.xyz"
                      className="text-primary hover:underline"
                    >
                      Go to QRbase &rarr;
                    </a>
                  </p>
                </div>
              )}

              {/* ALREADY_CLAIMED */}
              {state === "ALREADY_CLAIMED" && (
                <div className="text-center space-y-4">
                  <div className="text-4xl">&#9989;</div>
                  <h2 className="text-xl font-bold text-gray-900">
                    You already claimed this reward!
                  </h2>
                  <p className="text-muted">
                    Check your wallet for the USDC.
                  </p>
                </div>
              )}

              {/* ELIGIBLE_READY_TO_CLAIM */}
              {state === "ELIGIBLE_READY_TO_CLAIM" && eligibility && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 text-center">
                    You&apos;re eligible!
                  </h2>
                  <EligibilityChecks checks={eligibility.checks} />
                  <ClaimButton
                    amount={eligibility.claimAmount || "0"}
                    slotPosition={(status?.claimedCount || 0) + 1}
                    loading={false}
                    onClaim={submitClaim}
                  />
                </div>
              )}

              {/* CLAIMING */}
              {state === "CLAIMING" && (
                <div className="text-center space-y-4 py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-gray-700 font-medium">
                    Sending USDC to your wallet...
                  </p>
                  <p className="text-sm text-muted">
                    Please confirm the transaction in your wallet
                  </p>
                </div>
              )}

              {/* CLAIMED_SUCCESS */}
              {state === "CLAIMED_SUCCESS" && txHash && claimedAmount && (
                <ClaimSuccess amount={claimedAmount} txHash={txHash} />
              )}
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center text-xs text-muted pb-8">
          <p>
            Powered by{" "}
            <a
              href="https://qrbase.xyz"
              className="text-primary hover:underline"
            >
              QRbase
            </a>{" "}
            on Base
          </p>
        </div>
      </div>
    </div>
  );
}
