// Pure JWT helpers with no `server-only` import, so the proxy can use them too.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export const PENDING_VERIFICATION_COOKIE = "pending_verification";
export const PENDING_VERIFICATION_SECONDS = 15 * 60;

// Each token carries a `purpose` claim so a token issued for one flow can't be
// replayed in another. For example, a pending-verification token must not
// count as a signed-in session.
const PURPOSE_SESSION = "session";
const PURPOSE_PENDING_VERIFICATION = "email-verification";

export type SessionPayload = { userId: string };

function getSigningKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

async function signToken(purpose: string, claims: Record<string, string>, ttlSeconds: number) {
  return new SignJWT({ ...claims, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(getSigningKey());
}

/** Returns the claims if the token is valid, unexpired, and has the expected purpose. */
async function readToken(purpose: string, token: string | undefined): Promise<JWTPayload | null> {
  // Resolve the key outside the try block so a missing secret fails loudly
  // instead of silently logging every user out.
  const key = getSigningKey();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== purpose) return null;
    return payload;
  } catch {
    return null;
  }
}

export function encryptSession({ userId }: SessionPayload) {
  return signToken(PURPOSE_SESSION, { userId }, SESSION_DURATION_SECONDS);
}

/** Returns the session payload, or null if the token is missing, invalid, or expired. */
export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  const payload = await readToken(PURPOSE_SESSION, token);
  return typeof payload?.userId === "string" ? { userId: payload.userId } : null;
}

export function encryptPendingVerification(userId: string) {
  return signToken(PURPOSE_PENDING_VERIFICATION, { userId }, PENDING_VERIFICATION_SECONDS);
}

export async function decryptPendingVerification(token: string | undefined) {
  const payload = await readToken(PURPOSE_PENDING_VERIFICATION, token);
  return typeof payload?.userId === "string" ? payload.userId : null;
}
