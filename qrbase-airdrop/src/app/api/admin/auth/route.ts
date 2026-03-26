import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/auth — verify admin password
export async function POST(req: NextRequest) {
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
