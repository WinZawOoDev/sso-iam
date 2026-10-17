import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { RoleForm } from "@/components/admin/role-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifySession } from "@/lib/auth/dal";
import { ADMIN_ROLE_ID, PERMISSION_DEFINITIONS, hasPermission } from "@/lib/auth/permissions";
import { countUsersWithRole, listRoles } from "@/lib/db/users";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "roles:read")) forbidden();

  const canWrite = hasPermission(actor.permissions, "roles:write");
  const roles = await listRoles();
  const usage = await Promise.all(roles.map((role) => countUsersWithRole(role.id)));
  const labels = new Map(PERMISSION_DEFINITIONS.map((p) => [p.id, p.label]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">
          A user gets the permissions of every role assigned to them.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role, index) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {role.name}
                    {role.builtIn ? <Badge variant="outline">Built-in</Badge> : null}
                  </div>
                  <code className="text-xs text-muted-foreground">{role.id}</code>
                </TableCell>
                <TableCell>
                  {role.permissions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">None</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission) => (
                        <Badge key={permission} variant="secondary">
                          {labels.get(permission) ?? permission}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell>{usage[index]}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/dashboard/admin/roles/${role.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {canWrite && role.id !== ADMIN_ROLE_ID ? "Edit" : "View"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canWrite ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Create role</CardTitle>
            <CardDescription>Pick the permissions this role should grant.</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleForm mode="create" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
