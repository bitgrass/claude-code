import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { PlayerRow } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { handle: string } }) {
  const platform = _req.nextUrl.searchParams.get("platform") ?? "twitter";
  const rows = await sql`
    SELECT * FROM players WHERE handle = ${params.handle} AND platform = ${platform}
  `;
  if (rows.length === 0) {
    return NextResponse.json({ player: null });
  }
  const p = rows[0] as PlayerRow;
  return NextResponse.json({ player: { ...p, pr: Math.max(0, p.pr) } });
}
