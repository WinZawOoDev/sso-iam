import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { verifySession } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { listRoles, listUsers } from "@/lib/db/users";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await verifySession();
  if (!hasPermission(actor.permissions, "users:read")) forbidden();

  const { q = "" } = await searchParams;
  const canWrite = hasPermission(actor.permissions, "users:write");
  const [users, roles] = await Promise.all([listUsers(q), listRoles()]);
  const roleNames = new Map(roles.map((r) => [r.id, r.name]));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Accounts, their roles, and whether they can sign in.</p>
        </div>
        {canWrite ? (
          <Link href="/dashboard/admin/users/new" className={buttonVariants()}>
            New user
          </Link>
        ) : null}
      </div>

      <form action="/dashboard/admin/users" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          className="max-w-xs bg-background"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No users match your search.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {canWrite ? (
                      <Link href={`/dashboard/admin/users/${user.id}`} className="underline-offset-4 hover:underline">
                        {user.name}
                      </Link>
                    ) : (
                      user.name
                    )}
                    {user.id === actor.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((roleId) => (
                        <Badge key={roleId} variant="secondary">
                          {roleNames.get(roleId) ?? roleId}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.status === "active" ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="destructive">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
