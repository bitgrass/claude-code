"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FarcasterAuthButton } from "./FarcasterAuth";
import Image from "next/image";

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.857L2.196 2.25h6.813l4.261 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

function FarcasterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 1000 1000" fill="currentColor">
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
      <path d="M617.778 746.667C605.505 746.667 595.556 756.616 595.556 768.889V795.556H591.111C578.838 795.556 568.889 805.505 568.889 817.778V844.444H817.778V817.778C817.778 805.505 807.828 795.556 795.556 795.556H791.111V768.889C791.111 756.616 781.162 746.667 768.889 746.667V351.111H793.333L822.222 253.333H644.444V746.667H617.778Z" />
    </svg>
  );
}

export function Navbar() {
  const { authenticated, user, login, logout } = usePrivy();
  const { identity, setIdentity, disconnect } = useAuth();
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (authenticated && user?.twitter?.username) {
      // Detect wallet linked via Privy (embedded or connected)
      const walletAddress =
        (user as any)?.wallet?.address ||
        (user as any)?.linkedAccounts?.find(
          (a: { type: string }) => a.type === "wallet"
        )?.address ||
        null;

      setIdentity({
        handle: user.twitter.username,
        platform: "twitter",
        displayName: user.twitter.name || user.twitter.username,
        profilePhoto: user.twitter.profilePictureUrl || null,
        walletAddress,
      });
    }
  }, [authenticated, user, setIdentity]);

  const handleDisconnect = () => {
    if (identity?.platform === "twitter") logout();
    disconnect();
    setShowAuthMenu(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-border bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Image src="/logo.svg" alt="QRbase Community" width={160} height={40} className="h-9 w-auto" />


        {/* Auth */}
        <div className="relative">
          {identity ? (
            <button
              onClick={() => setShowAuthMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border-2 border-border hover:border-primary/40 bg-surface-muted transition-all"
            >
              {identity.profilePhoto ? (
                <Image
                  src={identity.profilePhoto}
                  alt={identity.handle}
                  width={28}
                  height={28}
                  className="rounded-full ring-2 ring-primary/30"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                  {identity.handle[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs font-bold text-gray-900">@{identity.handle}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  {identity.platform === "twitter" ? <><XIcon /> Twitter</> : <><FarcasterIcon /> Farcaster</>}
                </span>
              </div>
              <span className="text-muted text-xs">▾</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm bg-gray-900 hover:bg-gray-800 text-white transition-all shadow hover:shadow-md hover:-translate-y-0.5"
              >
                <XIcon />
                Sign in
              </button>
              {/* Only mount FarcasterAuthButton (and its nested PrivyProvider) after hydration
                  so we know identity is truly null — prevents iframe conflict errors */}
              {mounted && <FarcasterAuthButton onClose={() => {}} />}
            </div>
          )}

          {showAuthMenu && identity && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border-2 border-border bg-white shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-muted">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wide">gm,</p>
                <p className="font-black text-sm text-gray-900">@{identity.handle} 👋</p>
                {identity.walletAddress ? (
                  <p className="text-[10px] font-mono text-muted mt-1 truncate">
                    🔗 {identity.walletAddress.slice(0, 6)}…{identity.walletAddress.slice(-4)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted mt-1">⚠️ No wallet linked</p>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-3 text-sm font-semibold text-error hover:bg-red-50 transition-colors"
              >
                👋 Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
