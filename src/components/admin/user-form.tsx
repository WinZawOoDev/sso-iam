"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createUserAction, updateUserAction } from "@/app/actions/admin";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { MEMBER_ROLE_ID } from "@/lib/auth/permissions";
import type { UserStatus } from "@/lib/db/users";

type RoleOption = { id: string; name: string; description: string };

type UserFormProps =
  | { mode: "create"; roles: RoleOption[] }
  | {
      mode: "edit";
      userId: string;
      roles: RoleOption[];
      defaults: { name: string; email: string; roles: string[]; status: UserStatus };
    };

export function UserForm(props: UserFormProps) {
  const action =
    props.mode === "create" ? createUserAction : updateUserAction.bind(null, props.userId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const defaults = props.mode === "edit" ? props.defaults : undefined;
  const isChecked = (roleId: string) =>
    defaults ? defaults.roles.includes(roleId) : roleId === MEMBER_ROLE_ID;

  return (
    <form action={formAction} noValidate className="grid max-w-xl gap-5">
      {state?.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        label="Full name"
        name="name"
        defaultValue={defaults?.name ?? state?.fields?.name}
        errors={state?.errors?.name}
        required
      />

      <FormField
        label="Email"
        name="email"
        type="email"
        defaultValue={defaults?.email ?? state?.fields?.email}
        errors={state?.errors?.email}
        required
      />

      {props.mode === "create" ? (
        <FormField
          label="Initial password"
          name="password"
          type="password"
          autoComplete="new-password"
          errors={state?.errors?.password}
          required
        />
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Roles</legend>
        {props.roles.map((role) => (
          <label
            key={role.id}
            className="flex items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary/50"
          >
            <input
              type="checkbox"
              name="roles"
              value={role.id}
              defaultChecked={isChecked(role.id)}
              className="mt-1 size-4 accent-primary"
            />
            <span className="grid gap-0.5">
              <span className="text-sm font-medium">
                {role.name} <code className="text-xs text-muted-foreground">{role.id}</code>
              </span>
              <span className="text-xs text-muted-foreground">{role.description}</span>
            </span>
          </label>
        ))}
        {state?.errors?.roles ? (
          <p className="text-sm text-destructive">{state.errors.roles[0]}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-2">
        <label htmlFor="status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "active"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="active">Active</option>
          <option value="disabled">Disabled (cannot sign in)</option>
        </select>
        {state?.errors?.status ? (
          <p className="text-sm text-destructive">{state.errors.status[0]}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : props.mode === "create" ? "Create user" : "Save changes"}
        </Button>
        <Link href="/dashboard/admin/users" className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
