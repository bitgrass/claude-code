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

  // Sync Twitter Privy state → shared AuthContext
  useEffect(() => {
    if (authenticated && user?.twitter?.username) {
      setIdentity({
        handle: user.twitter.username,
        platform: "twitter",
        displayName: user.twitter.name || user.twitter.username,
        profilePhoto: user.twitter.profilePictureUrl || null,
      });
    }
  }, [authenticated, user, setIdentity]);

  const handleDisconnect = () => {
    if (identity?.platform === "twitter") logout();
    disconnect();
    setShowAuthMenu(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">Q</span>
          </div>
          <span className="font-bold text-lg text-gray-900">QRbase</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Community
          </span>
        </div>

        {/* Right: auth */}
        <div className="relative">
          {identity ? (
            // Connected — show avatar + handle
            <button
              onClick={() => setShowAuthMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:bg-surface-muted transition-all"
            >
              {identity.profilePhoto ? (
                <Image
                  src={identity.profilePhoto}
                  alt={identity.handle}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                  {identity.handle[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs font-semibold text-gray-900">
                  @{identity.handle}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  {identity.platform === "twitter" ? (
                    <><XIcon /> Twitter</>
                  ) : (
                    <><FarcasterIcon /> Farcaster</>
                  )}
                </span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            // Not connected — show both login options
            <div className="flex items-center gap-2">
              <button
                onClick={login}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
                  bg-gray-900 hover:bg-gray-800 text-white transition-all"
              >
                <XIcon />
                Sign in
              </button>
              <FarcasterAuthButton onClose={() => {}} />
            </div>
          )}

          {/* Dropdown */}
          {showAuthMenu && identity && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs text-muted">Connected as</p>
                <p className="font-semibold text-sm text-gray-900">@{identity.handle}</p>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-red-50 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
