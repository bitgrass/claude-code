"use client";

import { useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

const FARCASTER_APP_ID = process.env.NEXT_PUBLIC_FARCASTER_PRIVY_APP_ID || "cmeifjj1400sakv0b2dn2fjz7";

const TWITTER_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmiqj3rdf003fle0cjvt9egb5";
const PRIVY_COOKIES = ["privy-token", "privy-refresh-token"];

// Wipe only the TWITTER Privy app's localStorage keys before mounting the
// Farcaster provider. Clearing only the conflicting app's state prevents
// the Farcaster provider from picking up stale Twitter session data,
// while leaving the Farcaster app's own cached keys untouched.
function clearTwitterPrivyState() {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(`privy:${TWITTER_APP_ID}`))
    .forEach((k) => localStorage.removeItem(k));
  // Also clear shared auth cookies so there's no cross-app token bleed
  PRIVY_COOKIES.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

export default function FarcasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState lazy-init runs synchronously before first render —
  // Privy mounts with zero prior state, no stale-token logout loop.
  useState(() => clearTwitterPrivyState());

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
      {children}
    </PrivyProvider>
  );
}
