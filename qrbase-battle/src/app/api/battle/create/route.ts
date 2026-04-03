import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { generateRoomCode, randomSeed } from "@/lib/battle-utils";

export async function POST(req: NextRequest) {
  const { handle, name, photo, platform = "twitter" } = await req.json();
  if (!handle) return NextResponse.json({ error: "handle required" }, { status: 400 });
  const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";

  // Generate unique room code
  let roomId = generateRoomCode();
  for (let i = 0; i < 5; i++) {
    const existing = await sql`SELECT id FROM battles WHERE id = ${roomId}`;
    if (existing.length === 0) break;
    roomId = generateRoomCode();
  }

  await sql`
    INSERT INTO battles (id, player1_handle, player1_platform, player1_name, player1_photo, status, tile_seed)
    VALUES (${roomId}, ${handle}, ${safePlatform}, ${name ?? null}, ${photo ?? null}, 'waiting', ${randomSeed()})
  `;

  return NextResponse.json({ roomId });
}
