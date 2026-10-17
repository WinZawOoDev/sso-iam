import "server-only";

/**
 * Delivers a one-time verification code to the user.
 *
 * No email provider is configured yet. In development the code is printed to
 * the server console. In production this throws, so a missing provider fails
 * loudly instead of leaving users unable to verify. Replace the body with a
 * call to your provider (Resend, SES, Postmark, ...).
 */
export async function sendVerificationEmail(to: string, code: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No email provider configured: implement sendVerificationEmail in src/lib/auth/mailer.ts",
    );
  }

  console.log(`[dev] OTP for ${to}: ${code}`);
}
