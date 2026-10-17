"use client";

import { useActionState } from "react";
import { deleteRoleAction, deleteUserAction } from "@/app/actions/admin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DeleteUserButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(deleteUserAction.bind(null, userId), undefined);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this user? This cannot be undone.")) event.preventDefault();
      }}
      className="grid max-w-xl gap-3"
    >
      {state?.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting..." : "Delete user"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteRoleButton({ roleId }: { roleId: string }) {
  const [state, action, pending] = useActionState(deleteRoleAction.bind(null, roleId), undefined);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this role? Users keep no permissions from it afterwards.")) {
          event.preventDefault();
        }
      }}
      className="grid max-w-xl gap-3"
    >
      {state?.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div>
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting..." : "Delete role"}
        </Button>
      </div>
    </form>
  );
}
