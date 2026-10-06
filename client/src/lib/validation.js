import { z } from 'zod';
import { normalizeIndianMobile } from './phone.js';

// Client-side mirrors of server/src/modules/auth/auth.schemas.js (the server stays authoritative).
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export const nameField = z
  .string()
  .trim()
  .min(2, 'Name must be 2–100 characters')
  .max(100, 'Name must be 2–100 characters')
  .regex(NAME_RE, "Name can contain letters, spaces and . ' - only");

export const emailField = z.string().trim().min(1, 'Email is required').max(254, 'Email is too long').email('Enter a valid email address');
export const otpField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const signupSchema = z.object({ name: nameField, email: emailField });
export const loginSchema = z.object({ email: emailField });
export const otpSchema = z.object({ otp: otpField });
export const staffLoginSchema = z.object({ email: emailField, password: z.string().min(1, 'Password is required').max(128) });

/** Whole years between an ISO date (YYYY-MM-DD) and today (UTC). */
export function ageOn(iso, today = new Date()) {
  const d = new Date(`${iso}T00:00:00Z`);
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  const m = today.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < d.getUTCDate())) age -= 1;
  return age;
}

export const profileSchema = z.object({
  fullName: nameField,
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeIndianMobile(v) !== null, 'Enter a valid 10-digit Indian mobile number'),
  gender: z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY'], { errorMap: () => ({ message: 'Select a gender' }) }),
  dateOfBirth: z
    .string()
    .min(1, 'Birthdate is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date')
    .refine((v) => {
      const a = ageOn(v);
      return a >= 13 && a <= 120 && new Date(`${v}T00:00:00Z`) <= new Date();
    }, 'Age must be between 13 and 120'),
  wardNumber: z.coerce.number({ invalid_type_error: 'Choose your ward' }).int('Choose your ward').min(1, 'Choose your ward'),
});
