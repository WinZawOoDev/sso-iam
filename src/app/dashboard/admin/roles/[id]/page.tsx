import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { DeleteRoleButton } from "@/components/admin/delete-buttons";
import { RoleForm } from "@/components/admin/role-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/dal";
import { ADMIN_ROLE_ID, hasPermission } from "@/lib/auth/permissions";
import { getRole } from "@/lib/db/users";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "roles:read")) forbidden();

  const { id } = await params;
  const role = await getRole(id);
  if (!role) notFound();

  const canWrite = hasPermission(actor.permissions, "roles:write");
  const locked = role.id === ADMIN_ROLE_ID;

  return (
    <div className="grid max-w-2xl gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{role.name}</h1>
        {role.builtIn ? <Badge variant="outline">Built-in</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
          <CardDescription>
            Changes apply to every user with this role on their next request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canWrite || locked ? (
            <RoleForm
              mode="edit"
              roleId={role.id}
              locked={locked || !canWrite}
              defaults={{
                name: role.name,
                description: role.description,
                permissions: role.permissions,
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">You can view this role but not change it.</p>
          )}
        </CardContent>
      </Card>

      {canWrite && !role.builtIn ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete role</CardTitle>
            <CardDescription>
              Only possible when no user has this role. Remove it from users first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteRoleButton roleId={role.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
