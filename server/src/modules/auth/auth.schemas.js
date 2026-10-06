import { z } from 'zod';
import { GENDERS } from '../../models/Citizen.js';
import { normalizeIndianMobile } from '../../utils/phone.js';

/** Letters in any script (plus combining marks), space . ' - ; 2–100 chars (FR-A6). */
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export const nameField = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be 2–100 characters')
  .max(100, 'Name must be 2–100 characters')
  .regex(NAME_RE, "Name can contain letters, spaces and . ' - only");

export const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const otpField = z
  .string({ required_error: 'Code is required' })
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

export const signupRequestSchema = z.object({ name: nameField, email: emailField });
export const emailOnlySchema = z.object({ email: emailField });
export const verifySchema = z.object({ email: emailField, otp: otpField });
export const staffLoginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required').max(128),
});

/** Whole years between an ISO date (YYYY-MM-DD) and today (UTC). */
export function ageOn(dob, today = new Date()) {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export const profileSchema = z.object({
  fullName: nameField,
  phone: z.string({ required_error: 'Contact number is required' }).transform((v, ctx) => {
    const n = normalizeIndianMobile(v);
    if (!n) ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit Indian mobile number' });
    return n ?? '';
  }),
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Select a gender' }) }),
  dateOfBirth: z
    .string({ required_error: 'Birthdate is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')
    .transform((v, ctx) => {
      const d = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid date' });
        return d;
      }
      const age = ageOn(d);
      if (d > new Date() || age < 13 || age > 120) ctx.addIssue({ code: 'custom', message: 'Age must be between 13 and 120' });
      return d;
    }),
  wardNumber: z.coerce.number({ invalid_type_error: 'Choose your ward' }).int('Choose your ward').min(1, 'Choose your ward'),
});
