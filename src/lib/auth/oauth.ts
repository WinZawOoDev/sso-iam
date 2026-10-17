import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { ExternalProfile } from "@/lib/db/users";

/**
 * OAuth 2.0 authorization code flow with PKCE (S256) for Google and GitHub.
 * The state and PKCE verifier live in a signed, short-lived cookie (see
 * encryptOAuthState), so no server-side session store is needed.
 */

export const OAUTH_PROVIDER_IDS = ["google", "github"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export function isOAuthProvider(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

const PROVIDERS: Record<
  OAuthProviderId,
  {
    clientId: () => string | undefined;
    clientSecret: () => string | undefined;
    authorizeUrl: string;
    tokenUrl: string;
    scope: string;
  }
> = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
  },
  github: {
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
  },
};

const REQUEST_TIMEOUT_MS = 10_000;

export function isOAuthConfigured(provider: OAuthProviderId) {
  const config = PROVIDERS[provider];
  return Boolean(config.clientId() && config.clientSecret());
}

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/**
 * Callback URL registered with the provider. Set APP_URL in production so the
 * value doesn't depend on the Host header of incoming requests.
 */
export function callbackUrl(provider: OAuthProviderId, requestUrl: string) {
  const origin = process.env.APP_URL?.replace(/\/$/, "") ?? new URL(requestUrl).origin;
  return `${origin}/api/auth/oauth/${provider}/callback`;
}

export function createAuthorization(provider: OAuthProviderId, redirectUri: string) {
  const config = PROVIDERS[provider];
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  const url = new URL(config.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId() ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  return { url: url.toString(), state, verifier };
}

/** Constant-time comparison for the OAuth `state` value. */
export function stateMatches(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Exchanges the authorization code for an access token and reads the user's
 * profile. Returns null if the provider rejects anything along the way.
 */
export async function fetchOAuthProfile(
  provider: OAuthProviderId,
  input: { code: string; verifier: string; redirectUri: string },
): Promise<ExternalProfile | null> {
  try {
    return await exchangeAndFetchProfile(provider, input);
  } catch (error) {
    // Network failures, timeouts, and malformed JSON all land here. The caller
    // turns null into a generic sign-in error.
    console.error(`OAuth ${provider} sign-in failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

async function exchangeAndFetchProfile(
  provider: OAuthProviderId,
  input: { code: string; verifier: string; redirectUri: string },
): Promise<ExternalProfile | null> {
  const config = PROVIDERS[provider];
  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) return null;

  const tokenResponse = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: input.code,
      code_verifier: input.verifier,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return null;

  const tokens = (await tokenResponse.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  return provider === "google"
    ? fetchGoogleProfile(tokens.access_token)
    : fetchGitHubProfile(tokens.access_token);
}

async function fetchGoogleProfile(accessToken: string): Promise<ExternalProfile | null> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) return null;

  const user = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (!user.sub || !user.email) return null;

  return {
    provider: "google",
    externalId: user.sub,
    email: user.email,
    emailVerified: user.email_verified === true,
    name: user.name ?? user.email,
  };
}

async function fetchGitHubProfile(accessToken: string): Promise<ExternalProfile | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "sso-iam",
  };
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  const [userResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", { headers, signal, cache: "no-store" }),
    fetch("https://api.github.com/user/emails", { headers, signal, cache: "no-store" }),
  ]);
  if (!userResponse.ok || !emailsResponse.ok) return null;

  const user = (await userResponse.json()) as { id?: number; login?: string; name?: string | null };
  const emails = (await emailsResponse.json()) as { email: string; primary: boolean; verified: boolean }[];
  if (user.id === undefined) return null;

  // Only a verified address can be trusted for linking to a local account.
  const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  if (!primary) return null;

  return {
    provider: "github",
    externalId: String(user.id),
    email: primary.email,
    emailVerified: true,
    name: user.name || user.login || primary.email,
  };
}
