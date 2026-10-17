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
  return NextResponse.redirect(login);
}
