import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  callbackUrl,
  fetchOAuthProfile,
  isOAuthConfigured,
  isOAuthProvider,
  stateMatches,
} from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_COOKIE_PATH,
  decryptOAuthState,
} from "@/lib/auth/token";
import { findOrCreateExternalUser } from "@/lib/db/users";

// Provider redirects here after the user approves (or cancels) sign-in.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const cookieStore = await cookies();

  // The state cookie is single-use, so clear it on every outcome.
  const stored = await decryptOAuthState(cookieStore.get(OAUTH_STATE_COOKIE)?.value);
  cookieStore.delete({ name: OAUTH_STATE_COOKIE, path: OAUTH_STATE_COOKIE_PATH });

  if (!isOAuthProvider(provider)) redirect("/login?error=oauth_failed");
  if (!isOAuthConfigured(provider)) redirect("/login?error=oauth_not_configured");

  const url = new URL(request.url);
  if (url.searchParams.has("error")) redirect("/login?error=oauth_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || stored.provider !== provider || !stateMatches(state, stored.state)) {
    redirect("/login?error=oauth_state");
  }

  const profile = await fetchOAuthProfile(provider, {
    code,
    verifier: stored.verifier,
    redirectUri: callbackUrl(provider, request.url),
  });
  if (!profile) redirect("/login?error=oauth_failed");
  if (!profile.emailVerified) redirect("/login?error=oauth_no_email");

  const linked = await findOrCreateExternalUser(profile);
  if (!linked.ok) redirect("/login?error=email_in_use");

  await createSession(linked.user.id);
  redirect("/dashboard");
}
