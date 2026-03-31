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
          <img src="/farcasterIcon.svg" alt="Farcaster" className="w-8 h-8" />
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
