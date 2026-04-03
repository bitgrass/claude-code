import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { randomSeed } from "@/lib/battle-utils";
import type { BattleRow } from "@/lib/db";

const COUNTDOWN_MS = 4000;

export async function POST(req: NextRequest) {
  const { roomId, handle, name, photo, platform = "twitter" } = await req.json();
  if (!roomId || !handle) {
    return NextResponse.json({ error: "roomId and handle required" }, { status: 400 });
  }
  const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";

  const rows = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = rows[0] as BattleRow;
  if (room.status !== "done") {
    return NextResponse.json({ error: "Battle not finished" }, { status: 409 });
  }
  if (!room.player2_handle) {
    return NextResponse.json({ error: "Rematch requires two players" }, { status: 409 });
  }

  const isP1 = room.player1_handle === handle;
  const isP2 = room.player2_handle === handle;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const startedAt = new Date(Date.now() + COUNTDOWN_MS).toISOString();
  const nextSeed = randomSeed();

  const updated = isP1
    ? await sql`
        UPDATE battles
        SET status = 'active',
            tile_seed = ${nextSeed},
            started_at = ${startedAt},
            player1_solved_ms = NULL,
            player2_solved_ms = NULL,
            player1_moves = 0,
            player2_moves = 0,
            player1_board = NULL,
            player2_board = NULL,
            winner = NULL,
            winner_platform = NULL,
            rematch_room_id = NULL,
            player1_name = COALESCE(${name ?? null}, player1_name),
            player1_photo = COALESCE(${photo ?? null}, player1_photo),
            player1_platform = ${safePlatform}
        WHERE id = ${roomId}
        RETURNING *
      `
    : await sql`
        UPDATE battles
        SET status = 'active',
            tile_seed = ${nextSeed},
            started_at = ${startedAt},
            player1_solved_ms = NULL,
            player2_solved_ms = NULL,
            player1_moves = 0,
            player2_moves = 0,
            player1_board = NULL,
            player2_board = NULL,
            winner = NULL,
            winner_platform = NULL,
            rematch_room_id = NULL,
            player2_name = COALESCE(${name ?? null}, player2_name),
            player2_photo = COALESCE(${photo ?? null}, player2_photo),
            player2_platform = ${safePlatform}
        WHERE id = ${roomId}
        RETURNING *
      `;

  return NextResponse.json({ room: updated[0], roomId });
}