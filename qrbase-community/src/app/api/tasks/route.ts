import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER = process.env.GAME_WORKER_URL!;
const KEY    = process.env.GAME_API_KEY!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform") || "";
  const userId   = searchParams.get("userId")   || "";

  const url = new URL(`${WORKER}/tasks/active`);
  if (platform) url.searchParams.set("platform", platform);
  if (userId)   url.searchParams.set("userId", userId);

  try {
    const res  = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${KEY}` },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, error: "Worker unreachable" }, { status: 502 });
  }
}
