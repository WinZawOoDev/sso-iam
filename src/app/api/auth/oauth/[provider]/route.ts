import { NextResponse, type NextRequest } from "next/server";
import { callbackUrl, createAuthorization, isOAuthConfigured, isOAuthProvider } from "@/lib/auth/oauth";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_PATH,
  OAUTH_STATE_SECONDS,
  encryptOAuthState,
} from "@/lib/auth/token";

// Starts the sign-in flow: stores state + PKCE verifier in a signed cookie, then
// redirects to the provider.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
  }
  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", request.url));
  }

  const { url, state, verifier } = createAuthorization(
    provider,
    callbackUrl(provider, request.url),
  );

  const response = NextResponse.redirect(url);
  response.cookies.set(
    OAUTH_STATE_COOKIE,
    await encryptOAuthState({ provider, state, verifier }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: OAUTH_STATE_COOKIE_PATH,
      maxAge: OAUTH_STATE_SECONDS,
    },
  );
  return response;
}
