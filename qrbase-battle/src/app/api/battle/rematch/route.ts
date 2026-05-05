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
  if (!room.player2_handle) {
    return NextResponse.json({ error: "Rematch requires two players" }, { status: 409 });
  }

  const isP1 = room.player1_handle === handle;
  const isP2 = room.player2_handle === handle;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Idempotent rematch behavior: if rematch already started, return current room.
  if (room.status !== "done") {
    const current = isP1
      ? await sql`
          UPDATE battles
          SET player1_name = COALESCE(${name ?? null}, player1_name),
              player1_photo = COALESCE(${photo ?? null}, player1_photo),
              player1_platform = ${safePlatform}
          WHERE id = ${roomId}
          RETURNING *
        `
      : await sql`
          UPDATE battles
          SET player2_name = COALESCE(${name ?? null}, player2_name),
              player2_photo = COALESCE(${photo ?? null}, player2_photo),
              player2_platform = ${safePlatform}
          WHERE id = ${roomId}
          RETURNING *
        `;

    return NextResponse.json({ room: current[0], roomId, alreadyActive: true });
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
            player1_blur_until = NULL,
            player2_blur_until = NULL,
            player1_freeze_until = NULL,
            player2_freeze_until = NULL,
            player1_pending_spell_until = NULL,
            player2_pending_spell_until = NULL,
            player1_casting_until = NULL,
            player2_casting_until = NULL,
            winner = NULL,
            winner_platform = NULL,
            rematch_room_id = NULL,
            player1_name = COALESCE(${name ?? null}, player1_name),
            player1_photo = COALESCE(${photo ?? null}, player1_photo),
            player1_platform = ${safePlatform}
        WHERE id = ${roomId}
          AND status = 'done'
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
            player1_blur_until = NULL,
            player2_blur_until = NULL,
            player1_freeze_until = NULL,
            player2_freeze_until = NULL,
            player1_pending_spell_until = NULL,
            player2_pending_spell_until = NULL,
            player1_casting_until = NULL,
            player2_casting_until = NULL,
            winner = NULL,
            winner_platform = NULL,
            rematch_room_id = NULL,
            player2_name = COALESCE(${name ?? null}, player2_name),
            player2_photo = COALESCE(${photo ?? null}, player2_photo),
            player2_platform = ${safePlatform}
        WHERE id = ${roomId}
          AND status = 'done'
        RETURNING *
      `;

  if (updated.length === 0) {
    const latest = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
    if (latest.length === 0) return NextResponse.json({ error: "Room not found" }, { status: 404 });
    return NextResponse.json({ room: latest[0], roomId, alreadyActive: true });
  }

  return NextResponse.json({ room: updated[0], roomId });
}
