import type { NextRequest } from "next/server";

// Shared admin guard. The existing admin UI stores the admin secret in
// localStorage and sends it as `x-api-key` (campaigns/manage) or
// `x-admin-password` (featured). Accept either header against either configured
// secret so the usage dashboard reuses the exact same login the rest of the
// admin area uses — no new auth system introduced.
export function isAdminRequest(req: NextRequest): boolean {
  const provided =
    req.headers.get("x-api-key") || req.headers.get("x-admin-password") || "";
  if (!provided) return false;

  const secrets = [process.env.ADMIN_API_KEY, process.env.ADMIN_PASSWORD].filter(
    (s): s is string => Boolean(s)
  );
  if (secrets.length === 0) return false;

  return secrets.some((secret) => timingSafeEqual(provided, secret));
}

// Constant-time string comparison to avoid leaking secret length/content via
// response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
