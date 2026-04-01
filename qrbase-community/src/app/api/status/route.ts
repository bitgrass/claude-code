import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER = process.env.GAME_WORKER_URL!;
const KEY    = process.env.GAME_API_KEY!;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 });
  }

  try {
    const res  = await fetch(`${WORKER}/user?userId=${encodeURIComponent(userId)}`, {
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
