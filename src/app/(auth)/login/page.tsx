import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "@/components/auth/login-form";
import { LoginAlert } from "@/components/auth/login-alert";
import { KeycloakSignIn } from "@/components/auth/keycloak-sign-in";

export const metadata: Metadata = { title: "Sign in" };

// Reading searchParams makes this route dynamic, so it sits behind Suspense.
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <Suspense fallback={null}>
          <LoginAlert searchParams={searchParams} />
        </Suspense>

        <KeycloakSignIn />

        <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
          <Separator className="flex-1" />
          or
          <Separator className="flex-1" />
        </div>

        <LoginForm />
      </CardContent>
    </Card>
  );
}
