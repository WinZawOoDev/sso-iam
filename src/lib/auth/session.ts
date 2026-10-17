import "server-only";
import { cookies } from "next/headers";
import {
  PENDING_VERIFICATION_COOKIE,
  PENDING_VERIFICATION_SECONDS,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
  decryptPendingVerification,
  decryptSession,
  encryptPendingVerification,
  encryptSession,
} from "./token";

const isProduction = process.env.NODE_ENV === "production";

export async function createSession(userId: string) {
  const token = await encryptSession({ userId });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Reads the signed session cookie. Does not check that the user still exists. */
export async function getSessionUserId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decryptSession(token);
  return session?.userId ?? null;
}

/** Marks a browser as mid-verification for `userId`. Grants no access to the app. */
export async function setPendingVerification(userId: string) {
  const token = await encryptPendingVerification(userId);
  const cookieStore = await cookies();

  cookieStore.set(PENDING_VERIFICATION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_VERIFICATION_SECONDS,
  });
}

export async function getPendingVerificationUserId() {
  const token = (await cookies()).get(PENDING_VERIFICATION_COOKIE)?.value;
  return decryptPendingVerification(token);
}

export async function clearPendingVerification() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_VERIFICATION_COOKIE);
}
