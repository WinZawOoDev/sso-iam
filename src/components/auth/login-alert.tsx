import { Alert, AlertDescription } from "@/components/ui/alert";

// Keys are the only values the sign-in routes put in ?error=. Anything else is ignored.
const MESSAGES: Record<string, string> = {
  oauth_failed: "Sign-in with that provider failed. Please try again.",
  oauth_state: "Your sign-in session expired or was invalid. Please try again.",
  oauth_denied: "Sign-in was cancelled.",
  oauth_no_email: "Your provider account needs a verified email address to sign in.",
  oauth_not_configured: "This sign-in method is not configured yet.",
  email_in_use: "This email is already registered. Sign in with your password first.",
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
