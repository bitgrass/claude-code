import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { finalizeAllTimedOutBattles } from "@/lib/battle-lifecycle";

export const dynamic = "force-dynamic";

export async function GET() {
  await finalizeAllTimedOutBattles();

  const rows = await sql`
    SELECT
      id, status, created_at, started_at,
      player1_handle, player1_name, player1_photo,
      player2_handle, player2_name, player2_photo,
      player1_moves, player2_moves,
      player1_solved_ms, player2_solved_ms,
      winner, tile_seed
    FROM battles
    WHERE status = 'active'
       OR (status = 'waiting' AND created_at >= NOW() - INTERVAL '1 minute')
    ORDER BY
      CASE WHEN status = 'active' THEN 0 ELSE 1 END,
      started_at DESC NULLS LAST,
      created_at DESC
    LIMIT 20
  `;
  return NextResponse.json({ battles: rows });
}
