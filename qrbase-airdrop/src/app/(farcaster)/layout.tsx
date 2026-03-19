"use client";

import { useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

const FARCASTER_APP_ID = process.env.NEXT_PUBLIC_FARCASTER_PRIVY_APP_ID || "cmeifjj1400sakv0b2dn2fjz7";

const PRIVY_COOKIES = ["privy-token", "privy-refresh-token"];

// Wipe every privy:* key from localStorage + cookies before mounting the
// Farcaster provider so it starts completely fresh with no stale session data
// from the Twitter provider. Partial clearing (e.g. only privy:caid) leaves
// orphaned token/user entries that trigger an infinite logout loop.
function clearAllPrivyState() {
  if (typeof window === "undefined") return;
  Object.keys(localStorage)
    .filter((k) => k.startsWith("privy:"))
    .forEach((k) => localStorage.removeItem(k));
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
  useState(() => clearAllPrivyState());

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
