"use client";

import { Suspense, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function FarcasterAuthContent() {
  const { authenticated, ready, user, login } = usePrivy();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("return") || "/";

  // On successful Farcaster auth, save identity and do a full reload back.
  // Full reload is required so the (main) layout's Twitter PrivyProvider
  // initializes fresh — no cross-app React context leakage.
  useEffect(() => {
    if (authenticated && user?.farcaster?.fid) {
      localStorage.setItem(
        "fc_identity",
        JSON.stringify({
          fid: String(user.farcaster.fid),
          username: user.farcaster.username || "",
        })
      );
      // Clear Privy cookies before returning so the Twitter PrivyProvider
      // on the claim page doesn't find a Farcaster JWT and enter a logout loop.
      document.cookie = "privy-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "privy-refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = returnTo;
    }
  }, [authenticated, user, returnTo]);

  const isClearing = false;

  return (
    <div className="min-h-screen flex items-center justify-center qr-pattern p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-sm w-full text-center space-y-6">
        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-purple-600" viewBox="0 0 1000 1000" fill="currentColor">
            <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
            <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
            <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in with Farcaster</h1>
          <p className="text-sm text-muted">Authenticate with your Farcaster account to check eligibility.</p>
        </div>
        {(!ready || isClearing) && (
          <div className="animate-spin h-6 w-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto" />
        )}
        {ready && !authenticated && (
          <Button size="lg" className="w-full bg-purple-600 hover:bg-purple-700" onClick={login}>
            Connect Farcaster
          </Button>
        )}
        {authenticated && user?.farcaster?.fid && (
          <p className="text-sm text-muted animate-pulse">Redirecting...</p>
        )}
        <button
          onClick={() => { window.location.href = returnTo; }}
          className="text-xs text-muted hover:text-gray-900 underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function FarcasterAuthPage() {
  return (
    <Suspense>
      <FarcasterAuthContent />
    </Suspense>
  );
}
