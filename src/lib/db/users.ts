import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";

/**
 * In-memory user store. Data is lost when the server restarts.
 * Replace the bodies of these functions with your database (Postgres, SQLite,
 * an external IdP, ...) and keep the signatures the same.
 */

/** Accounts from external providers. Local accounts have no identities. */
export type ExternalProvider = "google" | "github" | "ldap";

export type Identity = { provider: ExternalProvider; externalId: string };

export type User = {
  id: string;
  name: string;
  email: string;
  /** Absent for accounts created only through an external provider. */
  passwordHash?: string;
  createdAt: string;
  emailVerified: boolean;
  identities: Identity[];
  /** scrypt hash of the active one-time code, if any. */
  otpHash?: string;
  otpExpiresAt?: string;
  /** Failed attempts against the active code. Reset when a new code is issued. */
  otpAttempts: number;
  otpSentAt?: string;
};

export type PublicUser = Pick<User, "id" | "name" | "email">;

export type ExternalProfile = {
  provider: ExternalProvider;
  externalId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

type Store = { users: Map<string, User> };

// Keep the store on globalThis so it survives hot reloads in `next dev`.
const globalForStore = globalThis as unknown as { __userStore?: Promise<Store> };

function getStore() {
  globalForStore.__userStore ??= createSeededStore();
  return globalForStore.__userStore;
}

async function createSeededStore(): Promise<Store> {
  const users = new Map<string, User>();

  // Demo account so the dashboard can be tried immediately. Already verified.
  const demo: User = {
    id: randomUUID(),
    name: "Demo User",
    email: "demo@example.com",
    passwordHash: await hashPassword("Password123!"),
    createdAt: new Date().toISOString(),
    emailVerified: true,
    identities: [],
    otpAttempts: 0,
  };
  users.set(demo.id, demo);

  return { users };
}

function toPublic({ id, name, email }: User): PublicUser {
  return { id, name, email };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const { users } = await getStore();
  for (const user of users.values()) {
    if (user.email === normalized) return user;
  }
  return null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const { users } = await getStore();
  const user = users.get(id);
  return user ? toPublic(user) : null;
}

/** Full record, including auth internals. Only for use inside server auth code. */
export async function getUserRecordById(id: string): Promise<User | null> {
  const { users } = await getStore();
  return users.get(id) ?? null;
}

/** Returns null if the email is already registered. New accounts start unverified. */
export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<PublicUser | null> {
  const { users } = await getStore();
  const email = input.email.trim().toLowerCase();

  for (const user of users.values()) {
    if (user.email === email) return null;
  }

  const user: User = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
    emailVerified: false,
    identities: [],
    otpAttempts: 0,
  };
  users.set(user.id, user);
  return toPublic(user);
}

/**
 * Resolves an external sign-in to a local account:
 * 1. A known identity returns its account.
 * 2. A matching email links to an existing account only when both the provider
 *    and the existing account have verified that email. Otherwise an attacker
 *    who pre-registered the address could be granted access to the real owner's
 *    identity when that owner signs in through the provider.
 * 3. Otherwise a new verified account is created.
 */
export async function findOrCreateExternalUser(
  profile: ExternalProfile,
): Promise<{ ok: true; user: PublicUser } | { ok: false; reason: "email_in_use" }> {
  const { users } = await getStore();
  const email = profile.email.trim().toLowerCase();

  for (const user of users.values()) {
    if (user.identities.some((i) => i.provider === profile.provider && i.externalId === profile.externalId)) {
      return { ok: true, user: toPublic(user) };
    }
  }

  const existing = [...users.values()].find((u) => u.email === email);
  if (existing) {
    if (!existing.emailVerified || !profile.emailVerified) {
      return { ok: false, reason: "email_in_use" };
    }
    existing.identities.push({ provider: profile.provider, externalId: profile.externalId });
    return { ok: true, user: toPublic(existing) };
  }

  const user: User = {
    id: randomUUID(),
    name: profile.name.trim() || email,
    email,
    createdAt: new Date().toISOString(),
    emailVerified: profile.emailVerified,
    identities: [{ provider: profile.provider, externalId: profile.externalId }],
    otpAttempts: 0,
  };
  users.set(user.id, user);
  return { ok: true, user: toPublic(user) };
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id" | "createdAt">>,
): Promise<void> {
  const { users } = await getStore();
  const user = users.get(id);
  if (user) Object.assign(user, patch);
}

/**
 * Atomically increments the failed-attempt counter and returns the new value.
 * Reserving the attempt before the code is checked means concurrent guesses
 * can't all read the same count and bypass the limit.
 */
export async function incrementOtpAttempts(id: string): Promise<number> {
  const { users } = await getStore();
  const user = users.get(id);
  if (!user) return Number.POSITIVE_INFINITY;
  user.otpAttempts += 1;
  return user.otpAttempts;
}
