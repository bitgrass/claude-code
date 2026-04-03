import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql`SELECT id, name, emoji, member_count, total_pr FROM team_standings`;

  const standings: Record<string, { name: string; emoji: string; total_pr: number; member_count: number }> = {
    red:   { name: "Red Team",   emoji: "🔴", total_pr: 0, member_count: 0 },
    blue:  { name: "Blue Team",  emoji: "🔵", total_pr: 0, member_count: 0 },
    green: { name: "Green Team", emoji: "🟢", total_pr: 0, member_count: 0 },
  };

  for (const row of rows) {
    if (row.id in standings) {
      standings[row.id] = {
        name: row.name,
        emoji: row.emoji,
        total_pr: Number(row.total_pr),
        member_count: Number(row.member_count),
      };
    }
  }

  return NextResponse.json({ standings });
}
