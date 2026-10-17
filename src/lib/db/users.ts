import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";

/**
 * In-memory user store. Data is lost when the server restarts.
 * Replace the bodies of these functions with your database (Postgres, SQLite,
 * an external IdP, ...) and keep the signatures the same.
 */

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type PublicUser = Pick<User, "id" | "name" | "email">;

type Store = { users: Map<string, User> };

// Keep the store on globalThis so it survives hot reloads in `next dev`.
const globalForStore = globalThis as unknown as { __userStore?: Promise<Store> };

function getStore() {
  globalForStore.__userStore ??= createSeededStore();
  return globalForStore.__userStore;
}

async function createSeededStore(): Promise<Store> {
  const users = new Map<string, User>();

  // Demo account so the dashboard can be tried immediately.
  const demo: User = {
    id: randomUUID(),
    name: "Demo User",
    email: "demo@example.com",
    passwordHash: await hashPassword("Password123!"),
    createdAt: new Date().toISOString(),
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

/** Returns null if the email is already registered. */
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
  };
  users.set(user.id, user);
  return toPublic(user);
}
