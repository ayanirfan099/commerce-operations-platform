import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Admin routes are protected in middleware; route handlers also call requireAdmin()
// in the app layer for defense in depth.
const ADMIN_PREFIXES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes: require a valid session cookie.
  if (ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
    const token = request.cookies.get("commerceops_session")?.value;
    if (!token) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    // Signature/expiry validation happens in route handlers via requireAdmin();
    // middleware only gates on cookie presence to avoid duplicating crypto here.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
