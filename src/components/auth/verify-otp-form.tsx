"use client";

import Link from "next/link";
import { useActionState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { resendOtp, verifyOtp } from "@/app/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function VerifyOtpForm() {
  const [state, action, pending] = useActionState(verifyOtp, undefined);
  const [resendState, resend, resending] = useActionState(resendOtp, undefined);

  return (
    <div className="grid gap-6">
      <form action={action} noValidate className="grid justify-items-center gap-4">
        {state?.message ? (
          <Alert variant="destructive" className="w-full">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <InputOTP
          name="code"
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete="one-time-code"
          autoFocus
          required
          aria-label="Verification code"
          aria-invalid={state?.errors?.code ? true : undefined}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, index) => (
              <InputOTPSlot key={index} index={index} className="size-10" />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {state?.errors?.code ? (
          <p className="text-sm text-destructive">{state.errors.code[0]}</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Verifying..." : "Verify email"}
        </Button>
      </form>

      <div className="grid gap-2 text-center text-sm text-muted-foreground">
        <form action={resend} className="flex flex-wrap items-center justify-center gap-1">
          <span>Didn&apos;t get a code?</span>
          <button
            type="submit"
            disabled={resending}
            className="text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
        </form>
        {resendState?.message ? (
          <p className={resendState.success ? "" : "text-destructive"}>{resendState.message}</p>
        ) : null}
        <p>
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
