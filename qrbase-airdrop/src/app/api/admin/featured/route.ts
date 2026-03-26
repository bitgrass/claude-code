import { NextRequest, NextResponse } from "next/server";
import { settingGet, settingSet, settingDelete } from "@/lib/redis";
import { getDb } from "@/lib/db";

const FEATURED_KEY = "admin:featured_campaign_id";

function checkAuth(req: NextRequest): boolean {
  const password = req.headers.get("x-admin-password");
  return password === process.env.ADMIN_PASSWORD;
}

interface ScanModeProgress {
  partnerName: string;
  totalWins: number;
  piecesUnlocked: number;
  totalPieces: number;
  description: string | null;
  partnerLogo: string;
  reward: number;
  minPuzzleWins: number;
  minScanBalance: number;
  primaryColor: string;
  gradientStart: string;
  gradientEnd: string;
}

async function fetchScanModeProgress(partnerName: string): Promise<ScanModeProgress | null> {
  try {
    const url = `https://www.qrbase.xyz/api/game/scanMode/progress?partnerName=${encodeURIComponent(partnerName)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[featured] scanMode API error: ${res.status} for ${url}`);
      return null;
    }
    const json = await res.json() as { success: boolean; data: ScanModeProgress };
    if (!json.success) console.error("[featured] scanMode API returned success:false", json);
    return json.success ? json.data : null;
  } catch (err) {
    console.error("[featured] scanMode fetch failed:", err);
    return null;
  }
}

// GET /api/admin/featured — returns current featured campaign + scanMode progress
export async function GET() {
  const prisma = getDb();
  const campaignId = await settingGet(FEATURED_KEY);
  if (!campaignId) return NextResponse.json({ campaign: null });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || !campaign.isActive) {
    await settingDelete(FEATURED_KEY);
    return NextResponse.json({ campaign: null });
  }

  // Fetch scanMode progress using token symbol (lowercase) as partnerName
  const progress = await fetchScanModeProgress(campaign.tokenSymbol.toLowerCase());

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      tokenSymbol: campaign.tokenSymbol,
      tokenAddress: campaign.tokenAddress,
      totalUsdc: campaign.totalUsdc.toString(),
      maxRecipients: campaign.maxRecipients,
    },
    progress,
  });
}

// POST /api/admin/featured — set featured campaign
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { campaignId } = await req.json() as { campaignId: string };
  await settingSet(FEATURED_KEY, campaignId);
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/featured — clear featured campaign
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await settingDelete(FEATURED_KEY);
  return NextResponse.json({ ok: true });
}
