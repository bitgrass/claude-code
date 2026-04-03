import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { team: string } }) {
  const { team } = params;
  if (!["red", "blue", "green"].includes(team)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  const members = await sql`
    SELECT handle, platform, display_name, photo, wins, losses, pr
    FROM players
    WHERE team = ${team}
    ORDER BY pr DESC
    LIMIT 50
  `;

  const clamped = members.map((m: any) => ({ ...m, pr: Math.max(0, Number(m.pr)) }));
  return NextResponse.json({ members: clamped });
}
