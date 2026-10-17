import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import {
  ADMIN_ROLE_ID,
  MEMBER_ROLE_ID,
  PERMISSION_IDS,
  type Permission,
} from "@/lib/auth/permissions";

/**
 * In-memory user and role store. Data is lost when the server restarts.
 * Replace the bodies of these functions with your database (Postgres, SQLite,
 * an external IdP, ...) and keep the signatures the same.
 */

/** Accounts from external providers. Local accounts have no identities. */
export type ExternalProvider = "google" | "github" | "ldap";

export type Identity = { provider: ExternalProvider; externalId: string };

export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  name: string;
  email: string;
  /** Absent for accounts created only through an external provider. */
  passwordHash?: string;
  createdAt: string;
  emailVerified: boolean;
  identities: Identity[];
  /** Role ids. Permissions come from the roles, never from this list directly. */
  roles: string[];
  status: UserStatus;
  /** scrypt hash of the active one-time code, if any. */
  otpHash?: string;
  otpExpiresAt?: string;
  /** Failed attempts against the active code. Reset when a new code is issued. */
  otpAttempts: number;
  otpSentAt?: string;
};

/** Safe to pass to the UI. Contains no credentials or OTP state. */
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  status: UserStatus;
  createdAt: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  /** Built-in roles can't be deleted. "admin" is also locked from edits. */
  builtIn: boolean;
};

export type ExternalProfile = {
  provider: ExternalProvider;
  externalId: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

type Store = { users: Map<string, User>; roles: Map<string, Role> };

// Keep the store on globalThis so it survives hot reloads in `next dev`.
// The key is versioned because the record shape changed when roles were added.
const globalForStore = globalThis as unknown as { __userStoreV2?: Promise<Store> };

function getStore() {
  globalForStore.__userStoreV2 ??= createSeededStore();
  return globalForStore.__userStoreV2;
}

async function createSeededStore(): Promise<Store> {
  const roles = new Map<string, Role>([
    [
      ADMIN_ROLE_ID,
      {
        id: ADMIN_ROLE_ID,
        name: "Administrator",
        description: "Full access, including user and role management.",
        permissions: [...PERMISSION_IDS],
        builtIn: true,
      },
    ],
    [
      MEMBER_ROLE_ID,
      {
        id: MEMBER_ROLE_ID,
        name: "Member",
        description: "Default role for new accounts. No administration access.",
        permissions: [],
        builtIn: true,
      },
    ],
  ]);

  const users = new Map<string, User>();

  // Demo account so the dashboard can be tried immediately. Already verified and an admin.
  const demo: User = {
    id: randomUUID(),
    name: "Demo User",
    email: "demo@example.com",
    passwordHash: await hashPassword("Password123!"),
    createdAt: new Date().toISOString(),
    emailVerified: true,
    identities: [],
    roles: [ADMIN_ROLE_ID],
    status: "active",
    otpAttempts: 0,
  };
  users.set(demo.id, demo);

  return { users, roles };
}

function permissionsFor(store: Store, roleIds: string[]): Permission[] {
  const granted = new Set<Permission>();
  for (const roleId of roleIds) {
    for (const permission of store.roles.get(roleId)?.permissions ?? []) {
      granted.add(permission);
    }
  }
  return [...granted];
}

function toPublic(store: Store, user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    permissions: permissionsFor(store, user.roles),
    status: user.status,
    createdAt: user.createdAt,
  };
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
  const store = await getStore();
  const user = store.users.get(id);
  return user ? toPublic(store, user) : null;
}

/** Full record, including auth internals. Only for use inside server auth code. */
export async function getUserRecordById(id: string): Promise<User | null> {
  const { users } = await getStore();
  return users.get(id) ?? null;
}

/** Users matching `query` by name or email, newest first. Empty query lists everyone. */
export async function listUsers(query = ""): Promise<PublicUser[]> {
  const store = await getStore();
  const needle = query.trim().toLowerCase();
  return [...store.users.values()]
    .filter((u) => !needle || u.name.toLowerCase().includes(needle) || u.email.includes(needle))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => toPublic(store, u));
}

export async function isEmailTaken(email: string, exceptUserId?: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const { users } = await getStore();
  for (const user of users.values()) {
    if (user.email === normalized && user.id !== exceptUserId) return true;
  }
  return false;
}

/** Returns null if the email is already registered. Defaults: unverified, member role, active. */
export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  roles?: string[];
  status?: UserStatus;
  /** Accounts created by an administrator are verified by that administrator. */
  emailVerified?: boolean;
}): Promise<PublicUser | null> {
  const store = await getStore();
  const email = input.email.trim().toLowerCase();

  for (const user of store.users.values()) {
    if (user.email === email) return null;
  }

  const user: User = {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    createdAt: new Date().toISOString(),
    emailVerified: input.emailVerified ?? false,
    identities: [],
    roles: input.roles ?? [MEMBER_ROLE_ID],
    status: input.status ?? "active",
    otpAttempts: 0,
  };
  store.users.set(user.id, user);
  return toPublic(store, user);
}

/**
 * Resolves an external sign-in to a local account:
 * 1. A known identity returns its account.
 * 2. A matching email links to an existing account only when both the provider
 *    and the existing account have verified that email. Otherwise an attacker
 *    who pre-registered the address could be granted access to the real owner's
 *    identity when that owner signs in through the provider.
 * 3. Otherwise a new verified account is created with the member role.
 * Disabled accounts are never returned.
 */
export async function findOrCreateExternalUser(
  profile: ExternalProfile,
): Promise<
  | { ok: true; user: PublicUser }
  | { ok: false; reason: "email_in_use" | "disabled" }
> {
  const store = await getStore();
  const email = profile.email.trim().toLowerCase();

  for (const user of store.users.values()) {
    if (user.identities.some((i) => i.provider === profile.provider && i.externalId === profile.externalId)) {
      if (user.status !== "active") return { ok: false, reason: "disabled" };
      return { ok: true, user: toPublic(store, user) };
    }
  }

  const existing = [...store.users.values()].find((u) => u.email === email);
  if (existing) {
    if (!existing.emailVerified || !profile.emailVerified) {
      return { ok: false, reason: "email_in_use" };
    }
    if (existing.status !== "active") return { ok: false, reason: "disabled" };
    existing.identities.push({ provider: profile.provider, externalId: profile.externalId });
    return { ok: true, user: toPublic(store, existing) };
  }

  const user: User = {
    id: randomUUID(),
    name: profile.name.trim() || email,
    email,
    createdAt: new Date().toISOString(),
    emailVerified: profile.emailVerified,
    identities: [{ provider: profile.provider, externalId: profile.externalId }],
    roles: [MEMBER_ROLE_ID],
    status: "active",
    otpAttempts: 0,
  };
  store.users.set(user.id, user);
  return { ok: true, user: toPublic(store, user) };
}

export async function updateUser(
  id: string,
  patch: Partial<Omit<User, "id" | "createdAt">>,
): Promise<void> {
  const { users } = await getStore();
  const user = users.get(id);
  if (user) Object.assign(user, patch);
}

export async function deleteUser(id: string): Promise<boolean> {
  const { users } = await getStore();
  return users.delete(id);
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

/** Active administrators. Used to stop the last one from being removed. */
export async function countActiveAdmins(): Promise<number> {
  const { users } = await getStore();
  let count = 0;
  for (const user of users.values()) {
    if (user.status === "active" && user.roles.includes(ADMIN_ROLE_ID)) count += 1;
  }
  return count;
}

export async function listRoles(): Promise<Role[]> {
  const { roles } = await getStore();
  const order = (r: Role) => (r.id === ADMIN_ROLE_ID ? 0 : r.id === MEMBER_ROLE_ID ? 1 : 2);
  return [...roles.values()].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name));
}

export async function getRole(id: string): Promise<Role | null> {
  const { roles } = await getStore();
  return roles.get(id) ?? null;
}

export async function countUsersWithRole(roleId: string): Promise<number> {
  const { users } = await getStore();
  let count = 0;
  for (const user of users.values()) {
    if (user.roles.includes(roleId)) count += 1;
  }
  return count;
}

/** Returns false if a role with this id already exists. */
export async function createRole(role: Omit<Role, "builtIn">): Promise<boolean> {
  const { roles } = await getStore();
  if (roles.has(role.id)) return false;
  roles.set(role.id, { ...role, builtIn: false });
  return true;
}

export async function updateRole(
  id: string,
  patch: Partial<Pick<Role, "name" | "description" | "permissions">>,
): Promise<boolean> {
  const { roles } = await getStore();
  const role = roles.get(id);
  if (!role) return false;
  Object.assign(role, patch);
  return true;
}

export async function deleteRole(id: string): Promise<boolean> {
  const { roles } = await getStore();
  return roles.delete(id);
}
