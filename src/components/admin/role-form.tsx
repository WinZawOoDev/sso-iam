"use client";

import { useActionState } from "react";
import { createRoleAction, updateRoleAction } from "@/app/actions/admin";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PERMISSION_DEFINITIONS, type Permission } from "@/lib/auth/permissions";

type RoleFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      roleId: string;
      /** Built-in admin role: shown read-only. */
      locked: boolean;
      defaults: { name: string; description: string; permissions: Permission[] };
    };

export function RoleForm(props: RoleFormProps) {
  const action = props.mode === "create" ? createRoleAction : updateRoleAction.bind(null, props.roleId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const locked = props.mode === "edit" && props.locked;
  const defaults = props.mode === "edit" ? props.defaults : undefined;

  return (
    <form action={formAction} noValidate className="grid max-w-xl gap-5">
      {state?.message ? (
        <Alert variant={state.success ? "default" : "destructive"}>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {props.mode === "create" ? (
        <FormField
          label="Role key"
          name="id"
          placeholder="auditor"
          autoComplete="off"
          errors={state?.errors?.id}
          required
        />
      ) : null}

      <FormField
        label="Name"
        name="name"
        placeholder="Auditor"
        defaultValue={defaults?.name}
        errors={state?.errors?.name}
        disabled={locked}
        required
      />

      <FormField
        label="Description"
        name="description"
        placeholder="What this role is for"
        defaultValue={defaults?.description}
        errors={state?.errors?.description}
        disabled={locked}
      />

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Permissions</legend>
        {PERMISSION_DEFINITIONS.map((permission) => (
          <label key={permission.id} className="flex items-center gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              name="permissions"
              value={permission.id}
              defaultChecked={
                defaults ? defaults.permissions.includes(permission.id) : false
              }
              disabled={locked}
              className="size-4 accent-primary"
            />
            <span className="text-sm">
              {permission.label} <code className="text-xs text-muted-foreground">{permission.id}</code>
            </span>
          </label>
        ))}
        {state?.errors?.permissions ? (
          <p className="text-sm text-destructive">{state.errors.permissions[0]}</p>
        ) : null}
      </fieldset>

      {locked ? (
        <p className="text-sm text-muted-foreground">
          This is the built-in administrator role. Its permissions can&apos;t be changed.
        </p>
      ) : (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : props.mode === "create" ? "Create role" : "Save role"}
          </Button>
        </div>
      )}
    </form>
  );
}
