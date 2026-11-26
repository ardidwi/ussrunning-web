import { NextResponse, type NextRequest } from "next/server";
import { NEON_AUTH_SESSION_COOKIE_NAME } from "@neondatabase/auth/server";

/**
 * UX routing only — never authorization. Visitors with no auth session cookie
 * at all have not signed in, so they are sent to the sign-in page instead of a
 * member/admin shell that would tell them their "session expired" and offer
 * "Sign out". Requests that carry a cookie continue unchanged: the server-side
 * guards (requireAuthenticatedUser / requirePermission) remain the authority
 * and correctly report a genuinely expired session.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(NEON_AUTH_SESSION_COOKIE_NAME)) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("returnTo", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/admin", "/admin/:path*"],
};
