import { NextResponse, type NextRequest } from "next/server";
import { deleteSession } from "@/lib/auth/session";

// Clears a session cookie whose user no longer exists (see verifySession).
// Sign-out from the UI uses the `logout` Server Action instead.
export async function GET(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
