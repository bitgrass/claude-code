import { NextRequest, NextResponse } from "next/server";
import { withUsage } from "@/lib/usage/track";

// POST /api/admin/auth — verify admin password
async function handler(req: NextRequest) {
  const { password } = await req.json() as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withUsage("/api/admin/auth", handler);
