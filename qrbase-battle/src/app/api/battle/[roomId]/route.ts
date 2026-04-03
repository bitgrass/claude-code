import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { parsePuzzleBoard, serializePuzzleBoard } from "@/lib/battle-utils";
import { finalizeTimedOutBattleById } from "@/lib/battle-lifecycle";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  await finalizeTimedOutBattleById(params.roomId);

  const handle = req.nextUrl.searchParams.get("handle");
  const movesParam = req.nextUrl.searchParams.get("moves");
  const boardParam = req.nextUrl.searchParams.get("board");

  // If handle + progress provided, update the player's move count and/or board state
  if (handle && (movesParam !== null || boardParam !== null)) {
    const parsedMoves = movesParam !== null ? parseInt(movesParam, 10) : NaN;
    const moves = Number.isInteger(parsedMoves) && parsedMoves >= 0 ? parsedMoves : null;
    const board = parsePuzzleBoard(boardParam);

    if (moves !== null || board !== null) {
      const rows = await sql`
        SELECT player1_handle, player2_handle, status
        FROM battles
        WHERE id = ${params.roomId}
      `;

      if (rows.length > 0) {
        const room = rows[0];
        if (room.status !== "active") {
          // Do not accept progress updates once battle is finished/timed out.
          const battleRows = await sql`SELECT * FROM battles WHERE id = ${params.roomId}`;
          if (battleRows.length === 0) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
          }
          return NextResponse.json({ room: battleRows[0] });
        }
        const serializedBoard = board ? serializePuzzleBoard(board) : null;

        if (room.player1_handle === handle) {
          if (moves !== null && serializedBoard !== null) {
            await sql`
              UPDATE battles
              SET player1_moves = ${moves}, player1_board = ${serializedBoard}
              WHERE id = ${params.roomId}
            `;
          } else if (moves !== null) {
            await sql`
              UPDATE battles
              SET player1_moves = ${moves}
              WHERE id = ${params.roomId}
            `;
          } else if (serializedBoard !== null) {
            await sql`
              UPDATE battles
              SET player1_board = ${serializedBoard}
              WHERE id = ${params.roomId}
            `;
          }
        } else if (room.player2_handle === handle) {
          if (moves !== null && serializedBoard !== null) {
            await sql`
              UPDATE battles
              SET player2_moves = ${moves}, player2_board = ${serializedBoard}
              WHERE id = ${params.roomId}
            `;
          } else if (moves !== null) {
            await sql`
              UPDATE battles
              SET player2_moves = ${moves}
              WHERE id = ${params.roomId}
            `;
          } else if (serializedBoard !== null) {
            await sql`
              UPDATE battles
              SET player2_board = ${serializedBoard}
              WHERE id = ${params.roomId}
            `;
          }
        }
      }
    }
  }

  const rows = await sql`SELECT * FROM battles WHERE id = ${params.roomId}`;
  if (rows.length === 0) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json({ room: rows[0] });
}
