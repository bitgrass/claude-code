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
  if (room.status !== "active") {
    return NextResponse.json({ error: "Battle not active" }, { status: 409 });
  }

  const isP1 = room.player1_handle === handle;
  const isP2 = room.player2_handle === handle;
  if (!isP1 && !isP2) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Race-safe finalization: only one solve request can close the battle and mutate stats.
  const updated = isP1
    ? await sql`
        UPDATE battles
        SET player1_solved_ms = ${solvedMs},
            player1_platform = ${safePlatform},
            status = 'done',
            winner = CASE
              WHEN player2_solved_ms IS NOT NULL AND player2_solved_ms < ${solvedMs}
                THEN player2_handle
              ELSE player1_handle
            END,
            winner_platform = CASE
              WHEN player2_solved_ms IS NOT NULL AND player2_solved_ms < ${solvedMs}
                THEN COALESCE(player2_platform, 'twitter')
              ELSE COALESCE(player1_platform, 'twitter')
            END
        WHERE id = ${roomId}
          AND status = 'active'
          AND winner IS NULL
          AND player1_solved_ms IS NULL
        RETURNING *`
    : await sql`
        UPDATE battles
        SET player2_solved_ms = ${solvedMs},
            player2_platform = ${safePlatform},
            status = 'done',
            winner = CASE
              WHEN player1_solved_ms IS NOT NULL AND player1_solved_ms < ${solvedMs}
                THEN player1_handle
              ELSE player2_handle
            END,
            winner_platform = CASE
              WHEN player1_solved_ms IS NOT NULL AND player1_solved_ms < ${solvedMs}
                THEN COALESCE(player1_platform, 'twitter')
              ELSE COALESCE(player2_platform, 'twitter')
            END
        WHERE id = ${roomId}
          AND status = 'active'
          AND winner IS NULL
          AND player2_solved_ms IS NULL
        RETURNING *`;

  // Another request already finalized this room; return latest room without applying stats twice.
  if (updated.length === 0) {
    const latest = await sql`SELECT * FROM battles WHERE id = ${roomId}`;
    if (latest.length === 0) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ room: latest[0] as BattleRow });
  }

  const updatedRoom = updated[0] as BattleRow;
  const p1Won = updatedRoom.winner === updatedRoom.player1_handle;
  const p1Platform = updatedRoom.player1_platform ?? "twitter";
  const p2Platform = updatedRoom.player2_platform ?? "twitter";

  await sql`
    INSERT INTO players (handle, platform, display_name, photo, wins, losses, pr)
    VALUES (
      ${updatedRoom.player1_handle}, ${p1Platform},
      ${updatedRoom.player1_name}, ${updatedRoom.player1_photo},
      ${p1Won ? 1 : 0}, ${p1Won ? 0 : 1}, ${p1Won ? 1 : 0}
    )
    ON CONFLICT (handle, platform) DO UPDATE SET
      wins       = players.wins + ${p1Won ? 1 : 0},
      losses     = players.losses + ${p1Won ? 0 : 1},
      pr         = GREATEST(0, (players.wins + ${p1Won ? 1 : 0}) - (players.losses + ${p1Won ? 0 : 1})),
      display_name = COALESCE(${updatedRoom.player1_name}, players.display_name),
      photo      = COALESCE(${updatedRoom.player1_photo}, players.photo),
      updated_at = NOW()
  `;

  if (updatedRoom.player2_handle) {
    const p2Won = !p1Won;
    await sql`
      INSERT INTO players (handle, platform, display_name, photo, wins, losses, pr)
      VALUES (
        ${updatedRoom.player2_handle}, ${p2Platform},
        ${updatedRoom.player2_name}, ${updatedRoom.player2_photo},
        ${p2Won ? 1 : 0}, ${p2Won ? 0 : 1}, ${p2Won ? 1 : 0}
      )
      ON CONFLICT (handle, platform) DO UPDATE SET
        wins       = players.wins + ${p2Won ? 1 : 0},
        losses     = players.losses + ${p2Won ? 0 : 1},
        pr         = GREATEST(0, (players.wins + ${p2Won ? 1 : 0}) - (players.losses + ${p2Won ? 0 : 1})),
        display_name = COALESCE(${updatedRoom.player2_name}, players.display_name),
        photo      = COALESCE(${updatedRoom.player2_photo}, players.photo),
        updated_at = NOW()
    `;
  }

  return NextResponse.json({ room: updatedRoom });
}
