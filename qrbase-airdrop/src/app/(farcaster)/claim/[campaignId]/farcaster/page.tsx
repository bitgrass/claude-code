"use client";

import { ClaimPage } from "@/components/claim/ClaimPage";

export default function FarcasterClaimPage({
  params,
}: {
  params: { campaignId: string };
}) {
  return <ClaimPage campaignId={params.campaignId} platform="farcaster" />;
}
