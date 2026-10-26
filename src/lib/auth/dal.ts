import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserById, type PublicUser } from "@/lib/db/users";
import { getSessionUserId } from "./session";

/**
 * Data Access Layer: the place where session + user lookups are verified.
 * `cache` dedupes calls within a single render pass.
 */

/**
 * Use in protected pages and layouts. Redirects when there is no valid session.
 * A cookie whose user no longer exists, or whose account was disabled, goes
 * through a route handler that clears it. Redirecting straight to /login would
 * loop, because the proxy sends signed-in users away from /login.
 */
export const verifySession = cache(async (): Promise<PublicUser> => {
  const userId = await getSessionUserId() ?? (await auth())?.user?.id;
  if (!userId) redirect("/login");

  const user = await findUserById(userId);
  if (!user) redirect("/api/auth/signout");
  if (user.status !== "active") redirect("/api/auth/signout?reason=disabled");

  return user;
});
