"use client";

import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { base } from "viem/chains";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export interface FarcasterIdentity {
  fid: string;
  username: string;
}

function FarcasterLoginInner({
  onAuthenticated,
}: {
  onAuthenticated: (identity: FarcasterIdentity) => void;
}) {
  const { authenticated, user, login } = usePrivy();

  useEffect(() => {
    if (authenticated && user?.farcaster?.fid) {
      onAuthenticated({
        fid: String(user.farcaster.fid),
        username: user.farcaster.username || "",
      });
    }
  }, [authenticated, user, onAuthenticated]);

  if (authenticated) return null;

  return (
    <Button size="lg" className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700" onClick={login}>
      <img src="/farcasterIcon.svg" alt="Farcaster" className="w-4 h-4" />
      Sign in with Farcaster
    </Button>
  );
}

const FARCASTER_APP_ID = process.env.NEXT_PUBLIC_FARCASTER_PRIVY_APP_ID || "cmeifjj1400sakv0b2dn2fjz7";

export function FarcasterAuthSection({
  onAuthenticated,
}: {
  onAuthenticated: (identity: FarcasterIdentity) => void;
}) {
  return (
    <PrivyProvider
      appId={FARCASTER_APP_ID}
      config={{
        loginMethods: ["farcaster"],
        appearance: { theme: "light", accentColor: "#8B5CF6" },
        embeddedWallets: { createOnLogin: "off" },
        defaultChain: base,
        supportedChains: [base],
      }}
    >
      <FarcasterLoginInner onAuthenticated={onAuthenticated} />
    </PrivyProvider>
  );
}
