"use client";

import { useEffect, useState } from "react";
import { getClaimInitials } from "@/lib/claimants";

function TwitterIcon({ size = 8 }: { size?: number }) {
  return <img src="/xIcon.svg" alt="X" width={size} height={size} />;
}

function FarcasterIcon({ size = 8 }: { size?: number }) {
  return <img src="/farcasterIcon.svg" alt="Farcaster" width={size} height={size} />;
}

export function ClaimantAvatar({
  avatar,
  handle,
  platform,
  size = 40,
  badgeSize = 18,
}: {
  avatar: string | null;
  handle: string;
  platform: "twitter" | "farcaster";
  size?: number;
  badgeSize?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatar]);

  const initials = getClaimInitials(handle);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <div className="h-full w-full overflow-hidden rounded-full border border-border bg-white shadow-sm">
        {avatar && !imageFailed ? (
          <img
            src={avatar}
            alt={handle}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        )}
      </div>
      <div
        className={`absolute -right-1.5 -top-1.5 flex items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${
          platform === "farcaster" ? "bg-violet-600" : "bg-gray-900"
        }`}
        style={{ width: badgeSize, height: badgeSize }}
      >
        {platform === "farcaster" ? (
          <FarcasterIcon size={badgeSize <= 18 ? 10 : 13} />
        ) : (
          <TwitterIcon size={badgeSize <= 18 ? 10 : 13} />
        )}
      </div>
    </div>
  );
}
