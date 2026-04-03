import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { BattleRow } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { roomId, handle, platform = "twitter", solvedMs } = await req.json();
  if (!roomId || !handle || typeof solvedMs !== "number") {
    return NextResponse.json({ error: "roomId, handle, solvedMs required" }, { status: 400 });
  }
  const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";

  const rows = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const room = rows[0] as BattleRow;
  if (room.status !== "active") return NextResponse.json({ error: "Battle not active" }, { status: 409 });

  const isP1 = room.player1_handle === handle;
  const isP2 = room.player2_handle === handle;
  if (!isP1 && !isP2) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const otherSolved = isP1 ? room.player2_solved_ms : room.player1_solved_ms;
  const winner = otherSolved !== null
    ? (solvedMs <= otherSolved ? handle : (isP1 ? room.player2_handle : room.player1_handle))
    : handle;

  const updated = isP1
    ? await sql`
        UPDATE battles
        SET player1_solved_ms = ${solvedMs}, status = 'done', winner = ${winner}
        WHERE id = ${roomId} RETURNING *`
    : await sql`
        UPDATE battles
        SET player2_solved_ms = ${solvedMs}, status = 'done', winner = ${winner}
        WHERE id = ${roomId} RETURNING *`;

  const updatedRoom = updated[0] as BattleRow;
  const p1Won = updatedRoom.winner === room.player1_handle;
  const p1Platform = isP1 ? safePlatform : room.player1_platform ?? "twitter";
  const p2Platform = isP2 ? safePlatform : room.player2_platform ?? "twitter";

  // Upsert player 1 — PR = GREATEST(0, wins − losses)
  await sql`
    INSERT INTO players (handle, platform, display_name, photo, wins, losses, pr)
    VALUES (
      ${room.player1_handle}, ${p1Platform},
      ${room.player1_name}, ${room.player1_photo},
      ${p1Won ? 1 : 0}, ${p1Won ? 0 : 1}, ${p1Won ? 1 : 0}
    )
    ON CONFLICT (handle, platform) DO UPDATE SET
      wins       = players.wins + ${p1Won ? 1 : 0},
      losses     = players.losses + ${p1Won ? 0 : 1},
      pr         = GREATEST(0, (players.wins + ${p1Won ? 1 : 0}) - (players.losses + ${p1Won ? 0 : 1})),
      display_name = COALESCE(${room.player1_name}, players.display_name),
      photo      = COALESCE(${room.player1_photo}, players.photo),
      updated_at = NOW()
  `;

  // Upsert player 2 (if exists)
  if (room.player2_handle) {
    const p2Won = !p1Won;
    await sql`
      INSERT INTO players (handle, platform, display_name, photo, wins, losses, pr)
      VALUES (
        ${room.player2_handle}, ${p2Platform},
        ${room.player2_name}, ${room.player2_photo},
        ${p2Won ? 1 : 0}, ${p2Won ? 0 : 1}, ${p2Won ? 1 : 0}
      )
      ON CONFLICT (handle, platform) DO UPDATE SET
        wins       = players.wins + ${p2Won ? 1 : 0},
        losses     = players.losses + ${p2Won ? 0 : 1},
        pr         = GREATEST(0, (players.wins + ${p2Won ? 1 : 0}) - (players.losses + ${p2Won ? 0 : 1})),
        display_name = COALESCE(${room.player2_name}, players.display_name),
        photo      = COALESCE(${room.player2_photo}, players.photo),
        updated_at = NOW()
    `;
  }

  return NextResponse.json({ room: updatedRoom });
}
