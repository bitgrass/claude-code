"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClaimSuccess } from "./ClaimSuccess";
import { useClaim } from "@/hooks/useClaim";
import type { ClaimAuthorization, EligibilityResult, SplitType } from "@/types";

interface ClaimFlowProps {
  campaignId: string;
  onChainId: number;
  splitType: SplitType;
  equalShare: bigint;
  totalAmount: bigint;
  maxRecipients: number;
  isActive: boolean;
}

type ClaimStep = "auth" | "wallet" | "checking" | "ineligible" | "ready" | "claiming" | "success";

export function ClaimFlow({
  campaignId,
  onChainId,
  splitType,
  equalShare,
  totalAmount,
  maxRecipients,
  isActive,
}: ClaimFlowProps) {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();
  const { claim, hash, isPending, isConfirming, isSuccess } = useClaim();

  const [step, setStep] = useState<ClaimStep>("auth");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [authorization, setAuthorization] = useState<ClaimAuthorization | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<bigint>(BigInt(0));
  const [error, setError] = useState<string | null>(null);

  // Determine step based on auth & wallet state
  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!session) {
      setStep("auth");
      return;
    }

    if (!isConnected) {
      setStep("wallet");
      return;
    }

    if (isSuccess && hash) {
      setStep("success");
      return;
    }

    if (authorization) {
      setStep("ready");
      return;
    }

    if (eligibility && !eligibility.eligible) {
      setStep("ineligible");
      return;
    }

    // Auto-check eligibility when both Twitter and wallet are connected
    if (session && isConnected && !eligibility && !authorization) {
      checkEligibility();
    }
  }, [session, sessionStatus, isConnected, eligibility, authorization, isSuccess, hash]);

  const checkEligibility = async () => {
    setStep("checking");
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEligibility({ eligible: false, reason: data.error || "Check failed" });
        setStep("ineligible");
        return;
      }

      if (data.eligible) {
        setAuthorization(data.authorization);
        setClaimedAmount(BigInt(data.authorization.amount));
        setStep("ready");
      } else {
        setEligibility(data);
        setStep("ineligible");
      }
    } catch {
      setError("Failed to check eligibility. Please try again.");
      setStep("wallet");
    }
  };

  const handleClaim = async () => {
    if (!authorization) return;
    setStep("claiming");
    try {
      await claim(authorization);
    } catch {
      setError("Transaction failed. Please try again.");
      setStep("ready");
    }
  };

  // Record claim in DB after on-chain success
  useEffect(() => {
    if (isSuccess && hash && authorization) {
      fetch(`/api/campaigns/${campaignId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          twitterId: authorization.twitterId,
          amount: authorization.amount,
          txHash: hash,
        }),
      }).catch(console.error);
      setStep("success");
    }
  }, [isSuccess, hash]);

  if (!isActive) {
    return (
      <Card className="text-center py-8">
        <p className="text-error text-lg font-semibold">Campaign Closed</p>
        <p className="text-muted text-sm mt-2">
          This campaign is no longer accepting claims.
        </p>
      </Card>
    );
  }

  const avgShare = maxRecipients > 0 ? Number(totalAmount) / maxRecipients : 0;
  const randomMin = (avgShare * 0.2) / 1e6;
  const randomMax = (avgShare * 2) / 1e6;

  return (
    <AnimatePresence mode="wait">
      {step === "auth" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Step 1: Verify Your Identity
              </h3>
              <p className="text-muted text-sm">
                Sign in with your X (Twitter) account to verify your eligibility
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => signIn("twitter")}
            >
              Sign in with X
            </Button>
          </Card>
        </motion.div>
      )}

      {step === "wallet" && (
        <motion.div
          key="wallet"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="text-center">
            <div className="mb-6">
              {session?.user?.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-12 h-12 rounded-full mx-auto mb-3"
                />
              )}
              <p className="text-success text-sm mb-4">
                Signed in as @{session?.user?.name || "user"}
              </p>
              <h3 className="text-xl font-bold text-white mb-2">
                Step 2: Connect Your Wallet
              </h3>
              <p className="text-muted text-sm">
                Connect your Base wallet to receive USDC
              </p>
            </div>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
            {error && (
              <p className="text-error text-sm mt-4">{error}</p>
            )}
          </Card>
        </motion.div>
      )}

      {step === "checking" && (
        <motion.div
          key="checking"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white font-semibold">
              Checking eligibility...
            </p>
            <p className="text-muted text-sm mt-2">
              Verifying your X account meets the campaign requirements
            </p>
          </Card>
        </motion.div>
      )}

      {step === "ineligible" && (
        <motion.div
          key="ineligible"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="text-center">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-error mb-2">Not Eligible</h3>
            <p className="text-muted text-sm mb-4">
              {eligibility?.reason || "You do not meet the requirements for this campaign."}
            </p>
            <Button variant="outline" size="md" onClick={() => {
              setEligibility(null);
              setStep("wallet");
            }}>
              Try Again
            </Button>
          </Card>
        </motion.div>
      )}

      {step === "ready" && (
        <motion.div
          key="ready"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card variant="highlighted" className="text-center">
            <h3 className="text-xl font-bold text-white mb-2">
              Ready to Claim!
            </h3>
            <div className="bg-surface-light rounded-xl p-4 mb-6">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Your Reward
              </p>
              {splitType === "EQUAL" ? (
                <p className="text-3xl font-bold text-accent">
                  ${(Number(claimedAmount) / 1e6).toFixed(2)} USDC
                </p>
              ) : (
                <div>
                  <p className="text-3xl font-bold text-accent">
                    ${(Number(claimedAmount) / 1e6).toFixed(2)} USDC
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Random range: ${randomMin.toFixed(2)} — ${randomMax.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={isPending}
              onClick={handleClaim}
            >
              Claim Your USDC
            </Button>
            {error && (
              <p className="text-error text-sm mt-4">{error}</p>
            )}
          </Card>
        </motion.div>
      )}

      {step === "claiming" && (
        <motion.div
          key="claiming"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card className="text-center py-8">
            <div className="animate-spin w-10 h-10 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-white font-semibold">
              {isConfirming ? "Confirming transaction..." : "Approve in your wallet..."}
            </p>
            <p className="text-muted text-sm mt-2">
              Please confirm the transaction in your wallet
            </p>
          </Card>
        </motion.div>
      )}

      {step === "success" && hash && (
        <ClaimSuccess
          amount={claimedAmount}
          txHash={hash}
          campaignId={campaignId}
        />
      )}
    </AnimatePresence>
  );
}
