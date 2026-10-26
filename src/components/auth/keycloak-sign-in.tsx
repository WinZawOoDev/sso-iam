import { signIn } from "@/auth";
import { buttonVariants } from "@/components/ui/button";

export function KeycloakSignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("keycloak", { redirectTo: "/dashboard" });
      }}
    >
      <button
        type="submit"
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Continue with Keycloak
      </button>
    </form>
  );
}
