import { Alert, AlertDescription } from "@/components/ui/alert";

// Keys are the only values the sign-in routes put in ?error=. Anything else is ignored.
const MESSAGES: Record<string, string> = {
  AccessDenied: "This Keycloak account can't access this application.",
  OAuthAccountNotLinked: "This account is already registered. Sign in with your password first.",
  OAuthCallbackError: "Keycloak sign-in failed. Please try again.",
  Configuration: "Keycloak sign-in is not configured yet.",
  account_disabled: "This account has been disabled. Contact an administrator.",
};

export async function LoginAlert({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;
  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
