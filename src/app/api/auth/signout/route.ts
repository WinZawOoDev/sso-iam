import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/session";

// Clears a session cookie that can no longer be used (user deleted or disabled).
// See verifySession. Sign-out from the UI uses the `logout` Server Action instead.
export async function GET(request: NextRequest) {
  await deleteSession();

  const login = new URL("/login", request.url);
  if (request.nextUrl.searchParams.get("reason") === "disabled") {
    login.searchParams.set("error", "account_disabled");
  }
  const response = NextResponse.redirect(login);
  // Also clear Auth.js JWT sessions when an account is disabled or removed.
  response.cookies.set("authjs.session-token", "", { path: "/", maxAge: 0 });
  response.cookies.set("__Secure-authjs.session-token", "", { path: "/", maxAge: 0, secure: true });
  return response;
}
