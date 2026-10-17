"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import {
  AdminCreateUserSchema,
  AdminUpdateUserSchema,
  RoleCreateSchema,
  RoleDetailsSchema,
  type FormState,
} from "@/lib/auth/definitions";
import { verifySession } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { ADMIN_ROLE_ID, hasPermission } from "@/lib/auth/permissions";
import {
  countActiveAdmins,
  countUsersWithRole,
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getRole,
  getUserRecordById,
  isEmailTaken,
  listRoles,
  updateRole,
  updateUser,
} from "@/lib/db/users";

/*
 * Every action re-checks the caller's permissions. The UI hiding a button is not
 * a security boundary, because server actions are reachable by direct POST.
 */

const DENIED: FormState = { message: "You don't have permission to do that." };
const str = (value: FormDataEntryValue | null) => String(value ?? "");
const strings = (formData: FormData, key: string) => formData.getAll(key).map(String);

async function findUnknownRole(roleIds: string[]) {
  const known = new Set((await listRoles()).map((r) => r.id));
  return roleIds.find((id) => !known.has(id)) ?? null;
}

/** Would removing this user's active admin access leave no active administrators? */
async function wouldRemoveLastAdmin(target: { roles: string[]; status: string }, nextRoles: string[], nextStatus: string) {
  const isActiveAdmin = target.status === "active" && target.roles.includes(ADMIN_ROLE_ID);
  const staysActiveAdmin = nextStatus === "active" && nextRoles.includes(ADMIN_ROLE_ID);
  return isActiveAdmin && !staysActiveAdmin && (await countActiveAdmins()) <= 1;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:write")) return DENIED;

  const values = {
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    password: str(formData.get("password")),
    roles: strings(formData, "roles"),
    status: str(formData.get("status")) || "active",
  };
  const fields = { name: values.name, email: values.email };

  const parsed = AdminCreateUserSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, fields };
  }

  const unknownRole = await findUnknownRole(parsed.data.roles);
  if (unknownRole) return { message: `Unknown role: ${unknownRole}`, fields };

  if (await isEmailTaken(parsed.data.email)) {
    return { message: "An account with this email already exists.", fields };
  }

  await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
    roles: parsed.data.roles,
    status: parsed.data.status,
    // An administrator creating the account vouches for the email address.
    emailVerified: true,
  });
  redirect("/dashboard/admin/users");
}

export async function updateUserAction(
  userId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:write")) return DENIED;

  const target = await getUserRecordById(userId);
  if (!target) return { message: "User not found." };

  const parsed = AdminUpdateUserSchema.safeParse({
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    roles: strings(formData, "roles"),
    status: str(formData.get("status")),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { name, email, roles, status } = parsed.data;

  const unknownRole = await findUnknownRole(roles);
  if (unknownRole) return { message: `Unknown role: ${unknownRole}` };

  if (await isEmailTaken(email, userId)) {
    return { message: "Another account already uses this email." };
  }

  const isSelf = target.id === actor.id;
  if (isSelf && status === "disabled") {
    return { message: "You can't disable your own account." };
  }
  if (isSelf && !roles.includes(ADMIN_ROLE_ID)) {
    return { message: "You can't remove the administrator role from your own account." };
  }
  if (await wouldRemoveLastAdmin(target, roles, status)) {
    return { message: "At least one active administrator is required." };
  }

  await updateUser(userId, { name, email, roles, status });
  redirect("/dashboard/admin/users");
}

// Bound to the user id in the UI, so it takes no form state of its own.
export async function deleteUserAction(userId: string): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:delete")) return DENIED;

  const target = await getUserRecordById(userId);
  if (!target) return { message: "User not found." };

  if (target.id === actor.id) {
    return { message: "You can't delete your own account." };
  }
  if (await wouldRemoveLastAdmin(target, [], "disabled")) {
    return { message: "At least one active administrator is required." };
  }

  await deleteUser(userId);
  redirect("/dashboard/admin/users");
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function createRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "roles:write")) return DENIED;

  const values = {
    id: str(formData.get("id")),
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    permissions: strings(formData, "permissions"),
  };

  const parsed = RoleCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const created = await createRole(parsed.data);
  if (!created) return { errors: { id: ["A role with this key already exists."] } };

  redirect("/dashboard/admin/roles");
}

export async function updateRoleAction(
  roleId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "roles:write")) return DENIED;

  if (roleId === ADMIN_ROLE_ID) {
    return { message: "The administrator role is built in and can't be changed." };
  }
  if (!(await getRole(roleId))) return { message: "Role not found." };

  const parsed = RoleDetailsSchema.safeParse({
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    permissions: strings(formData, "permissions"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  await updateRole(roleId, parsed.data);
  return { success: true, message: "Role saved." };
}

export async function deleteRoleAction(roleId: string): Promise<FormState> {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "roles:write")) return DENIED;

  const role = await getRole(roleId);
  if (!role) return { message: "Role not found." };
  if (role.builtIn) return { message: "Built-in roles can't be deleted." };

  const assigned = await countUsersWithRole(roleId);
  if (assigned > 0) {
    return { message: `This role is assigned to ${assigned} user(s). Remove it from them first.` };
  }

  await deleteRole(roleId);
  redirect("/dashboard/admin/roles");
}
