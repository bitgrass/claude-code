"use client";

import { ClaimPage } from "@/components/claim/ClaimPage";

export default function TwitterClaimPage({
  params,
}: {
  params: { campaignId: string };
}) {
  return <ClaimPage campaignId={params.campaignId} platform="twitter" />;
}
