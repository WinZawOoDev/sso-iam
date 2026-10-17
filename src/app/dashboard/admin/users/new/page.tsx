import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { UserForm } from "@/components/admin/user-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifySession } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { listRoles } from "@/lib/db/users";

export const metadata: Metadata = { title: "New user" };

export default async function NewUserPage() {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:write")) forbidden();

  const roles = await listRoles();

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
        <p className="text-sm text-muted-foreground">
          Creates a verified account. Share the initial password with the user through a secure channel.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
          <CardDescription>The user can change their password later.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="create"
            roles={roles.map(({ id, name, description }) => ({ id, name, description }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
