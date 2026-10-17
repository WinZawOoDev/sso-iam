import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifyOtpForm } from "@/components/auth/verify-otp-form";
import { maskEmail } from "@/lib/auth/definitions";
import { getPendingVerificationUserId } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";

export async function VerifyOtpCard() {
  const userId = await getPendingVerificationUserId();
  if (!userId) redirect("/login");

  const user = await findUserById(userId);
  if (!user) redirect("/login");

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Verify your email</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to {maskEmail(user.email)}. It expires in 10 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyOtpForm />
      </CardContent>
    </Card>
  );
}
