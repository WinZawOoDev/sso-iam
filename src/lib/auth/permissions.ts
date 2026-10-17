// Shared with client components (role editor), so no `server-only` import here.

/**
 * Permission catalog. Adding an entry here makes it available in the role editor.
 * Enforce it on the server with hasPermission(); the UI only hides controls.
 */
export const PERMISSION_DEFINITIONS = [
  { id: "users:read", label: "View users" },
  { id: "users:write", label: "Create and edit users" },
  { id: "users:delete", label: "Delete users" },
  { id: "roles:read", label: "View roles" },
  { id: "roles:write", label: "Create, edit and delete roles" },
] as const;

export type Permission = (typeof PERMISSION_DEFINITIONS)[number]["id"];

export const PERMISSION_IDS = PERMISSION_DEFINITIONS.map((d) => d.id) as [
  Permission,
  ...Permission[],
];

export const ADMIN_ROLE_ID = "admin";
export const MEMBER_ROLE_ID = "member";

/** Lowercase key such as "auditor" or "help-desk". Used as the stable role id. */
export const ROLE_ID_PATTERN = /^[a-z][a-z0-9-]{2,39}$/;

export function hasPermission(permissions: readonly Permission[], required: Permission) {
  return permissions.includes(required);
}
