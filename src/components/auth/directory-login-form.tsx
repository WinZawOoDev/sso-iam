"use client";

import { useActionState } from "react";
import { directoryLogin } from "@/app/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DirectoryLoginForm() {
  const [state, action, pending] = useActionState(directoryLogin, undefined);

  return (
    <form action={action} noValidate className="grid gap-4">
      {state?.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <FormField
        label="Username"
        name="username"
        autoComplete="username"
        placeholder="jdoe"
        errors={state?.errors?.username}
        required
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state?.errors?.password}
        required
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in with directory"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Use your directory username and password, the same ones you use on your work computer.
      </p>
    </form>
  );
}
