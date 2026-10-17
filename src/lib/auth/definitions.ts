import * as z from "zod";
import { PERMISSION_IDS, ROLE_ID_PATTERN } from "./permissions";

export const LoginSchema = z.object({
  email: z.email({ error: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
});

const PasswordSchema = z
  .string()
  .min(8, { error: "Be at least 8 characters long." })
  .regex(/[a-zA-Z]/, { error: "Contain at least one letter." })
  .regex(/[0-9]/, { error: "Contain at least one number." })
  .regex(/[^a-zA-Z0-9]/, {
    error: "Contain at least one special character.",
  });

const NameSchema = z.string().min(2, { error: "Name must be at least 2 characters long." }).trim();
const EmailSchema = z.email({ error: "Please enter a valid email." }).trim();

export const RegisterSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  password: PasswordSchema,
});

/** Fields an administrator sets on a user. The password is set only on create. */
const AdminUserFieldsSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  roles: z.array(z.string().min(1)).min(1, { error: "Select at least one role." }),
  status: z.enum(["active", "disabled"], { error: "Choose a status." }),
});

export const AdminCreateUserSchema = AdminUserFieldsSchema.extend({
  password: PasswordSchema,
});

export const AdminUpdateUserSchema = AdminUserFieldsSchema;

export const RoleDetailsSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters long." }).max(60),
  description: z.string().trim().max(200, { error: "Keep the description under 200 characters." }),
  permissions: z.array(z.enum(PERMISSION_IDS)),
});

export const RoleCreateSchema = RoleDetailsSchema.extend({
  id: z
    .string()
    .trim()
    .regex(ROLE_ID_PATTERN, {
      error: "Use 3-40 lowercase letters, digits or dashes, starting with a letter.",
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
