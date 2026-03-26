"use client";

import { useEffect, useState } from "react";
import { getClaimInitials } from "@/lib/claimants";

function TwitterIcon({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FarcasterIcon({ size = 8 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1000 1000" fill="currentColor">
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z" />
      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 768.889V795.556H155.556C143.283 795.556 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z" />
      <path d="M675.556 746.667C663.283 746.667 653.333 768.889V795.556H648.889C636.616 795.556 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z" />
    </svg>
  );
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
        className={`absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${
          platform === "farcaster" ? "bg-violet-600" : "bg-gray-900"
        }`}
        style={{ width: badgeSize, height: badgeSize }}
      >
        {platform === "farcaster" ? (
          <FarcasterIcon size={badgeSize <= 14 ? 8 : 10} />
        ) : (
          <TwitterIcon size={badgeSize <= 14 ? 8 : 10} />
        )}
      </div>
    </div>
  );
}
