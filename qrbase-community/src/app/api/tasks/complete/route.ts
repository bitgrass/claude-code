import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKER = process.env.GAME_WORKER_URL!;
const KEY    = process.env.GAME_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { taskId, userId, walletAddress, miniappAdded } = body;

    if (!taskId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing taskId or userId" },
        { status: 400 }
      );
    }

    const res = await fetch(`${WORKER}/tasks/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, userId, walletAddress, miniappAdded }),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Worker unreachable" },
      { status: 502 }
    );
  }
}
