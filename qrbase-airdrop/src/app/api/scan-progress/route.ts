import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GAME_API_KEY = process.env.GAME_PUBLIC_API_KEY ?? "pub_qrbase_ext_7f8k2mX9pLwR4vNz";

// GET /api/scan-progress?partnerName=SCAN[&userId=x%3AHandle&walletAddress=0x...]
// Server-side proxy — keeps GAME_PUBLIC_API_KEY off the client
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const partnerName = searchParams.get("partnerName");
  if (!partnerName) {
    return NextResponse.json({ error: "partnerName is required" }, { status: 400 });
  }

  const userId = searchParams.get("userId");
  const walletAddress = searchParams.get("walletAddress");

  let upstream = `https://beta.qrbase.xyz/api/game/scanMode/progress?partnerName=${encodeURIComponent(partnerName)}`;
  if (userId) upstream += `&userId=${encodeURIComponent(userId)}`;
  if (walletAddress) upstream += `&walletAddress=${encodeURIComponent(walletAddress)}`;

  try {
    const res = await fetch(upstream, { headers: { "x-api-key": GAME_API_KEY }, cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to fetch scan progress" }, { status: 502 });
  }
}
