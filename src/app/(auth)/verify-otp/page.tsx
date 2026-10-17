import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyOtpCard } from "@/components/auth/verify-otp-card";

export const metadata: Metadata = { title: "Verify your email" };

// Reads the pending-verification cookie, so it streams behind Suspense.
export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-muted-foreground">Loading...</div>
      }
    >
      <VerifyOtpCard />
    </Suspense>
  );
}
