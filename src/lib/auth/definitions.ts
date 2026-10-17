import * as z from "zod";

export const LoginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
});

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, { error: "Name must be at least 2 characters long." })
    .trim(),
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { error: "Be at least 8 characters long." })
    .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
    .regex(/[0-9]/, { error: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      error: "Contain at least one special character.",
    }),
});

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
});

export const DirectoryLoginSchema = z.object({
  username: z.string().trim().min(1, { error: "Enter your username." }),
  password: z.string().min(1, { error: "Password is required." }),
});

export const OtpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code." }),
});

/** "jane@example.com" -> "j***@example.com", for display on the verify page. */
export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * Shared shape returned by auth Server Actions and consumed by
 * `useActionState`. `fields` echoes non-sensitive input back to the form so
 * users don't have to retype their email after a validation error.
 */
export type FormState =
  | {
      errors?: Record<string, string[] | undefined>;
      message?: string;
      fields?: { name?: string; email?: string };
      success?: boolean;
    }
  | undefined;
