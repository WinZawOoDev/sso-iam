import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { DeleteUserButton } from "@/components/admin/delete-buttons";
import { UserForm } from "@/components/admin/user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { findUserById, listRoles } from "@/lib/db/users";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:write")) forbidden();

  const { id } = await params;
  const [user, roles] = await Promise.all([findUserById(id), listRoles()]);
  if (!user) notFound();

  const canDelete = hasPermission(actor.permissions, "users:delete") && user.id !== actor.id;

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Roles decide what the user can do. Disabling the account ends their sessions on the next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            userId={user.id}
            roles={roles.map(({ id, name, description }) => ({ id, name, description }))}
            defaults={{
              name: user.name,
              email: user.email,
              roles: user.roles,
              status: user.status,
            }}
          />
        </CardContent>
      </Card>

      {canDelete ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete user</CardTitle>
            <CardDescription>Removes the account and its linked sign-in methods.</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteUserButton userId={user.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
