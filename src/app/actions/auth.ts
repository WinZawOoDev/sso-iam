"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import * as z from "zod";
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  type FormState,
} from "@/lib/auth/definitions";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/db/users";

const str = (value: FormDataEntryValue | null) => String(value ?? "");

// Used to run a password check even when the email is unknown, so response
// timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hashPassword(randomUUID());
  return dummyHash;
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

  await createSession(user.id);
  redirect("/dashboard");
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
  redirect("/login");
}
