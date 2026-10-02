import { z } from "zod";

// Client-side mirrors of the server's Bean Validation rules (the server remains authoritative).

export const nameField = z.string().trim().min(2, "Name must be 2–100 characters").max(100, "Name must be 2–100 characters");
export const emailField = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254);
export const otpField = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export const signupSchema = z.object({ name: nameField, email: emailField });
export const loginSchema = z.object({ email: emailField });
export const otpSchema = z.object({ otp: otpField });
export const adminLoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required").max(128),
});

export const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
] as const;

export function ageOn(dob: string, today = new Date()): number {
  const d = new Date(`${dob}T00:00:00Z`);
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export const profileSchema = (wardCount: number) =>
  z.object({
    fullName: nameField.refine(() => true),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], { errorMap: () => ({ message: "Select a gender" }) }),
    dateOfBirth: z
      .string()
      .min(1, "Birthdate is required")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
      .refine((v) => {
        const a = ageOn(v);
        return a >= 13 && a <= 120;
      }, "Age must be between 13 and 120"),
    wardNumber: z.coerce
      .number({ invalid_type_error: "Choose a valid ward number" })
      .int("Choose a valid ward number")
      .min(1, `Ward must be between 1 and ${wardCount}`)
      .max(wardCount, `Ward must be between 1 and ${wardCount}`),
  });
export type ProfileValues = z.infer<ReturnType<typeof profileSchema>>;

export const complaintTextSchema = z.object({
  description: z.string().trim().min(10, "Description must be 10–1000 characters").max(1000, "Description must be 10–1000 characters"),
  category: z.string().optional(),
  address: z.string().trim().max(300, "Address is too long").optional(),
});
export type ComplaintTextValues = z.infer<typeof complaintTextSchema>;

export const reopenSchema = z.object({
  reason: z.string().trim().min(5, "Reason must be 5–500 characters").max(500, "Reason must be 5–500 characters"),
});
