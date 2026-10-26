"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import * as z from "zod";
import { signOut } from "@/auth";
import {
  ForgotPasswordSchema,
  LoginSchema,
  OtpSchema,
  RegisterSchema,
  type FormState,
} from "@/lib/auth/definitions";
import { checkOtp, completeVerification, sendOtp } from "@/lib/auth/otp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearPendingVerification,
  createSession,
  deleteSession,
  getPendingVerificationUserId,
  setPendingVerification,
} from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/db/users";

const str = (value: FormDataEntryValue | null) => String(value ?? "");

// Used to run a password check even when the email is unknown, so response
// timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash;
}

/** Starts email verification for `userId` and moves the browser to the verify page. */
async function startVerification(userId: string) {
  await sendOtp(userId); // "cooldown" just means a code was sent recently; reuse it.
  await setPendingVerification(userId);
  redirect("/verify-otp");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = str(formData.get("email"));
  const password = str(formData.get("password"));

  const parsed = LoginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      fields: { email },
    };
  }

  const user = await findUserByEmail(parsed.data.email);
  const passwordHash = user?.passwordHash ?? (await getDummyHash());
  const passwordOk = await verifyPassword(parsed.data.password, passwordHash);

  if (!user || !passwordOk) {
    return { message: "Invalid email or password.", fields: { email } };
  }

  if (user.status !== "active") {
    return { message: "This account has been disabled. Contact an administrator.", fields: { email } };
  }

  // Only reached with the correct password, so this doesn't reveal anything to
  // someone guessing credentials.
  if (!user.emailVerified) {
    await startVerification(user.id);
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const password = str(formData.get("password"));

  const parsed = RegisterSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      fields: { name, email },
    };
  }

  const user = await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
  });

  if (!user) {
    return {
      message: "An account with this email already exists.",
      fields: { name, email },
    };
  }

  // No session yet: the account is unverified. The user gets a session only
  // after entering the code.
  await startVerification(user.id);
}

export async function verifyOtp(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = str(formData.get("code")).replace(/\s/g, "");

  const parsed = OtpSchema.safeParse({ code });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const userId = await getPendingVerificationUserId();
  if (!userId) redirect("/login");

  const result = await checkOtp(userId, parsed.data.code);

  if (result === "none") {
    return { message: "No active code. Request a new one." };
  }
  if (result === "expired") {
    return { message: "This code has expired. Request a new one." };
  }
  if (result === "locked") {
    return { message: "Too many incorrect attempts. Request a new code." };
  }
  if (result === "invalid") {
    return { message: "Incorrect code. Please try again." };
  }

  await completeVerification(userId);
  await clearPendingVerification();
  await createSession(userId);
  redirect("/dashboard");
}

export async function resendOtp(): Promise<FormState> {
  const userId = await getPendingVerificationUserId();
  if (!userId) redirect("/login");

  const result = await sendOtp(userId);
  if (result === "cooldown") {
    return { message: "Please wait a moment before requesting another code." };
  }
  return { success: true, message: "A new code has been sent." };
}

export async function forgotPassword(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = str(formData.get("email"));

  const parsed = ForgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      fields: { email },
    };
  }

  // Same response whether or not the account exists, so this form can't be used
  // to enumerate users. No email is sent yet; wire up a mail provider here.
  return {
    success: true,
    message:
      "If an account exists for that email, you will receive password reset instructions shortly.",
    fields: { email },
  };
}

export async function logout() {
  await deleteSession();
  await signOut({ redirectTo: "/login" });
}
