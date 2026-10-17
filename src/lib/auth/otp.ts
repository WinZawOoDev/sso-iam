import "server-only";
import { randomInt } from "node:crypto";
import { getUserRecordById, incrementOtpAttempts, updateUser } from "@/lib/db/users";
import { hashPassword, verifyPassword } from "./password";
import { sendVerificationEmail } from "./mailer";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

export type SendOtpResult = "sent" | "cooldown";
export type CheckOtpResult = "ok" | "invalid" | "expired" | "locked" | "none";

/**
 * Generates a fresh 6-digit code, stores its hash, and emails it.
 * Returns "cooldown" without sending if a code was sent within the cooldown window.
 */
export async function sendOtp(userId: string): Promise<SendOtpResult> {
  const user = await getUserRecordById(userId);
  if (!user) return "cooldown";

  const now = Date.now();
  if (user.otpSentAt && now - Date.parse(user.otpSentAt) < OTP_RESEND_COOLDOWN_MS) {
    return "cooldown";
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await updateUser(user.id, {
    otpHash: await hashPassword(code),
    otpExpiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    otpAttempts: 0,
    otpSentAt: new Date(now).toISOString(),
  });
  await sendVerificationEmail(user.email, code);
  return "sent";
}

/** Checks a submitted code. Each call counts as an attempt against the active code. */
export async function checkOtp(userId: string, code: string): Promise<CheckOtpResult> {
  const user = await getUserRecordById(userId);
  if (!user?.otpHash || !user.otpExpiresAt) return "none";

  if (Date.now() > Date.parse(user.otpExpiresAt)) return "expired";

  // Reserve the attempt before comparing. See incrementOtpAttempts.
  const attempts = await incrementOtpAttempts(user.id);
  if (attempts > OTP_MAX_ATTEMPTS) return "locked";

  const matches = await verifyPassword(code, user.otpHash);
  return matches ? "ok" : "invalid";
}

/** Marks the email verified and discards the used code. */
export async function completeVerification(userId: string) {
  await updateUser(userId, {
    emailVerified: true,
    otpHash: undefined,
    otpExpiresAt: undefined,
    otpAttempts: 0,
  });
}
