import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { EligibilityRule } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = req.headers.get("x-api-key");
  if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { minLevel } = await req.json() as { minLevel?: number | null };
  if (minLevel === undefined) {
    return NextResponse.json({ error: "minLevel is required" }, { status: 400 });
  }

  const normalizedMinLevel = minLevel === null ? 0 : Math.floor(Number(minLevel));
  if (!Number.isFinite(normalizedMinLevel) || normalizedMinLevel < 0) {
    return NextResponse.json({ error: "minLevel must be a non-negative number" }, { status: 400 });
  }

  const prisma = getDb();
  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const rules = Array.isArray(campaign.eligibilityRules)
    ? campaign.eligibilityRules as unknown as EligibilityRule[]
    : [];

  let updatedExistingRule = false;
  const nextRules = rules.flatMap((rule) => {
    if (rule.type !== "min_level") return [rule];
    if (normalizedMinLevel <= 0) return [];

    updatedExistingRule = true;
    return [{ ...rule, min: normalizedMinLevel }];
  });

  if (normalizedMinLevel > 0 && !updatedExistingRule) {
    nextRules.push({ type: "min_level", min: normalizedMinLevel });
  }

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      eligibilityRules: nextRules as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    campaignId: updated.id,
    minLevel: normalizedMinLevel,
    eligibilityRules: updated.eligibilityRules,
  });
}
