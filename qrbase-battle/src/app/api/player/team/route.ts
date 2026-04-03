import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { handle, platform = "twitter", team, displayName, photo } = await req.json();
  const safePlatform = platform === "farcaster" ? "farcaster" : "twitter";
  const safeTeam = team ?? null;

  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  if (safeTeam !== null && !["red", "blue", "green"].includes(safeTeam)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  await sql`
    INSERT INTO players (handle, platform, display_name, photo, team, wins, losses, pr)
    VALUES (${handle}, ${safePlatform}, ${displayName ?? null}, ${photo ?? null}, ${safeTeam}, 0, 0, 0)
    ON CONFLICT (handle, platform) DO UPDATE SET
      team = ${safeTeam},
      display_name = COALESCE(${displayName ?? null}, players.display_name),
      photo = COALESCE(${photo ?? null}, players.photo),
      updated_at = NOW()
  `;

  const rows = await sql`SELECT * FROM players WHERE handle = ${handle} AND platform = ${safePlatform}`;
  return NextResponse.json({ player: rows[0] });
}
