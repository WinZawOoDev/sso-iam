import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findUserById, type PublicUser } from "@/lib/db/users";
import { getSessionUserId } from "./session";

/**
 * Data Access Layer: the place where session + user lookups are verified.
 * `cache` dedupes calls within a single render pass.
 */

/** Returns the signed-in user, or null. Verifies against the user store, not just the cookie. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return findUserById(userId);
});

/**
 * Use in protected pages and layouts. Redirects when there is no valid session.
 * A cookie whose user no longer exists, or whose account was disabled, goes
 * through a route handler that clears it. Redirecting straight to /login would
 * loop, because the proxy sends signed-in users away from /login.
 */
export const verifySession = cache(async (): Promise<PublicUser> => {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await findUserById(userId);
  if (!user) redirect("/api/auth/signout");
  if (user.status !== "active") redirect("/api/auth/signout?reason=disabled");

  return user;
});
