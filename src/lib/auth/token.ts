// Pure JWT helpers with no `server-only` import, so the proxy can use them too.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

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

export async function encryptSession({ userId }: SessionPayload) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSigningKey());
}

/** Returns the session payload, or null if the token is missing, invalid, or expired. */
export async function decryptSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  // Resolve the key outside the try block so a missing secret fails loudly
  // instead of silently logging every user out.
  const key = getSigningKey();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
