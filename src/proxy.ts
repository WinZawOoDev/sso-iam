import { NextResponse, type NextRequest } from "next/server";
import {
  PENDING_VERIFICATION_COOKIE,
  SESSION_COOKIE,
  decryptPendingVerification,
  decryptSession,
} from "@/lib/auth/token";

/**
 * Optimistic check only: verifies the cookie signature and expiry, without a
 * database lookup. Pages and actions still call `verifySession()` for the real check.
 */
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/verify-otp"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthenticated = session !== null;

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", request.url),
    );
  }

  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (AUTH_PAGES.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // The verify page is only reachable mid-registration or mid-login.
  if (pathname === "/verify-otp") {
    const pending = await decryptPendingVerification(
      request.cookies.get(PENDING_VERIFICATION_COOKIE)?.value,
    );
    if (!pending) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/forgot-password", "/verify-otp", "/dashboard/:path*"],
};
