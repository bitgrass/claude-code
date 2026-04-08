import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { ChatMessageRow, Platform, Team } from "@/lib/db";

type ChatChannel = "global" | "team";

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const MAX_MESSAGE_LENGTH = 280;

type ChatMessageApiRow = ChatMessageRow & {
  user_team: Team | null;
};

function parseChannel(value: string | null): ChatChannel | null {
  if (value === "global" || value === "team") return value;
  return null;
}

function parseTeam(value: string | null): Team | null {
  if (value === "red" || value === "blue" || value === "green") return value;
  return null;
}

function parsePlatform(value: string | null | undefined): Platform {
  return value === "farcaster" ? "farcaster" : "twitter";
}

function parseLimit(value: string | null): number {
  const parsed = value ? Number.parseInt(value, 10) : DEFAULT_LIMIT;
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseSinceId(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeMessage(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channel = parseChannel(req.nextUrl.searchParams.get("channel")) ?? "global";
  const team = parseTeam(req.nextUrl.searchParams.get("team"));
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const sinceId = parseSinceId(req.nextUrl.searchParams.get("sinceId"));

  if (channel === "team" && !team) {
    return NextResponse.json({ error: "team is required for team channel" }, { status: 400 });
  }

  let rows: ChatMessageApiRow[] = [];
  if (channel === "global") {
    if (sinceId !== null) {
      rows = (await sql`
        SELECT
          cm.id,
          cm.channel,
          cm.team,
          cm.handle,
          cm.platform,
          cm.display_name,
          cm.photo,
          cm.message,
          cm.created_at,
          COALESCE(p.team, cm.team) AS user_team
        FROM chat_messages cm
        LEFT JOIN players p
          ON p.handle = cm.handle
         AND p.platform = cm.platform
        WHERE cm.channel = 'global'
          AND cm.id > ${sinceId}
        ORDER BY cm.id ASC
        LIMIT ${limit}
      `) as ChatMessageApiRow[];
    } else {
      rows = (await sql`
        SELECT
          m.id,
          m.channel,
          m.team,
          m.handle,
          m.platform,
          m.display_name,
          m.photo,
          m.message,
          m.created_at,
          COALESCE(p.team, m.team) AS user_team
        FROM (
          SELECT *
          FROM chat_messages
          WHERE channel = 'global'
          ORDER BY id DESC
          LIMIT ${limit}
        ) m
        LEFT JOIN players p
          ON p.handle = m.handle
         AND p.platform = m.platform
        ORDER BY m.id ASC
      `) as ChatMessageApiRow[];
    }
  } else {
    if (sinceId !== null) {
      rows = (await sql`
        SELECT
          cm.id,
          cm.channel,
          cm.team,
          cm.handle,
          cm.platform,
          cm.display_name,
          cm.photo,
          cm.message,
          cm.created_at,
          COALESCE(p.team, cm.team) AS user_team
        FROM chat_messages cm
        LEFT JOIN players p
          ON p.handle = cm.handle
         AND p.platform = cm.platform
        WHERE cm.channel = 'team'
          AND cm.team = ${team}
          AND cm.id > ${sinceId}
        ORDER BY cm.id ASC
        LIMIT ${limit}
      `) as ChatMessageApiRow[];
    } else {
      rows = (await sql`
        SELECT
          m.id,
          m.channel,
          m.team,
          m.handle,
          m.platform,
          m.display_name,
          m.photo,
          m.message,
          m.created_at,
          COALESCE(p.team, m.team) AS user_team
        FROM (
          SELECT *
          FROM chat_messages
          WHERE channel = 'team'
            AND team = ${team}
          ORDER BY id DESC
          LIMIT ${limit}
        ) m
        LEFT JOIN players p
          ON p.handle = m.handle
         AND p.platform = m.platform
        ORDER BY m.id ASC
      `) as ChatMessageApiRow[];
    }
  }

  const messages = rows.map((row) => ({
    ...row,
    user_team: parseTeam((row.user_team as string | null) ?? null),
  }));

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const channel = parseChannel(body.channel ?? null) ?? "global";
  const team = parseTeam(body.team ?? null);
  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  const platform = parsePlatform(body.platform);
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : null;
  const photo = typeof body.photo === "string" ? body.photo : null;
  const message = normalizeMessage(body.message);

  if (!handle) {
    return NextResponse.json({ error: "handle required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `message too long (max ${MAX_MESSAGE_LENGTH} chars)` },
      { status: 400 }
    );
  }

  let safeTeam: Team | null = null;
  if (channel === "team") {
    if (!team) {
      return NextResponse.json({ error: "team is required for team channel" }, { status: 400 });
    }
    const rows = await sql`
      SELECT team
      FROM players
      WHERE handle = ${handle}
        AND platform = ${platform}
      LIMIT 1
    `;
    const userTeam = parseTeam((rows[0]?.team as string | null) ?? null);
    if (!userTeam) {
      return NextResponse.json({ error: "Join a team before posting in team chat" }, { status: 403 });
    }
    if (userTeam !== team) {
      return NextResponse.json(
        { error: `You can only post in your own team chat (${userTeam} team)` },
        { status: 403 }
      );
    }
    safeTeam = userTeam;
  }

  const inserted = (await sql`
    INSERT INTO chat_messages (channel, team, handle, platform, display_name, photo, message)
    VALUES (${channel}, ${safeTeam}, ${handle}, ${platform}, ${displayName}, ${photo}, ${message})
    RETURNING *
  `) as ChatMessageRow[];

  return NextResponse.json({ message: inserted[0] });
}
