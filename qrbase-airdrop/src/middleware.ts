import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Clear Privy cookies before any Farcaster-provider page loads so the
// Farcaster PrivyProvider never picks up the Twitter app's token.
function isFarcasterRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/farcaster") ||
    pathname.endsWith("/farcaster")
  );
}

export function middleware(request: NextRequest) {
  if (isFarcasterRoute(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.cookies.set("privy-token", "", { maxAge: 0, path: "/" });
    response.cookies.set("privy-refresh-token", "", { maxAge: 0, path: "/" });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/farcaster/:path*", "/claim/:campaignId/farcaster"],
};
