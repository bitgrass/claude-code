import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER = process.env.GAME_WORKER_URL!;
const KEY    = process.env.GAME_API_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab    = searchParams.get("tab")    || "wins";
  const limit  = searchParams.get("limit")  || "50";
  const offset = searchParams.get("offset") || "0";
  const userId = searchParams.get("userId") || "";

  let url = `${WORKER}/leaderboard?tab=${tab}&limit=${limit}&offset=${offset}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;

  try {
    const res  = await fetch(url, {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, {
      status: res.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Worker unreachable" }, { status: 502 });
  }
}
