import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { BattleRow } from "@/lib/db";

const COUNTDOWN_MS = 4000;

export async function POST(req: NextRequest) {
  const { roomId, handle, name, photo, platform = "twitter" } = await req.json();
  if (!roomId || !handle) return NextResponse.json({ error: "roomId and handle required" }, { status: 400 });
  const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";

  const rows = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = rows[0] as BattleRow;

  if (room.status !== "waiting") return NextResponse.json({ error: "Room is no longer open" }, { status: 409 });

  // Player1 rejoining their own room
  if (room.player1_handle === handle) return NextResponse.json({ room });

  const startedAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();

  const updated = await sql`
    UPDATE battles
    SET player2_handle = ${handle},
        player2_platform = ${safePlatform},
        player2_name   = ${name ?? null},
        player2_photo  = ${photo ?? null},
        status         = 'active',
        started_at     = ${startedAt}
    WHERE id = ${roomId}
    RETURNING *
  `;

  return NextResponse.json({ room: updated[0] });
}
