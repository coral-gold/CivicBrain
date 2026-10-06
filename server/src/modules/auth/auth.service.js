import bcrypt from 'bcrypt';
import { Citizen } from '../../models/Citizen.js';
import { Staff } from '../../models/Staff.js';
import { sendMail } from '../../mail/mailer.js';
import { templates } from '../../mail/templates.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { audit } from './audit.js';
import { issueOtp, OTP_RESEND_S, OTP_TTL_S, verifyOtp } from './otp.service.js';

/** Identical for every outcome of an OTP request, so responses never reveal whether an email is registered (FR-A4, FR-A8). */
export const OTP_SENT_RESPONSE = Object.freeze({
  message: 'If the details are valid, a 6-digit code has been sent to your email.',
  resendAfterSeconds: OTP_RESEND_S,
  expiresInSeconds: OTP_TTL_S,
});

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
// Compared against when the staff email is unknown, so timing does not reveal which emails exist (FR-A11).
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12);

function sendInBackground(msg) {
  sendMail(msg).catch((e) => logger.error({ error: e?.message }, 'mail failed'));
}

export async function requestSignupOtp({ name, email }, req) {
  const exists = await Citizen.exists({ email });
  const code = await issueOtp({ email, purpose: 'SIGNUP', payload: { name }, deliver: !exists }, req);
  if (exists) sendInBackground({ to: email, ...templates.accountExists() });
  else sendInBackground({ to: email, ...templates.otp(code, 'SIGNUP', OTP_TTL_S / 60), meta: { type: 'OTP', code } });
  return OTP_SENT_RESPONSE;
}

export async function requestLoginOtp({ email }, req) {
  const exists = await Citizen.exists({ email });
  const code = await issueOtp({ email, purpose: 'LOGIN', deliver: !!exists }, req);
  if (code) sendInBackground({ to: email, ...templates.otp(code, 'LOGIN', OTP_TTL_S / 60), meta: { type: 'OTP', code } });
  return OTP_SENT_RESPONSE;
}

/** Correct signup OTP creates the citizen with status PROFILE_PENDING (FR-A3). */
export async function verifySignup({ email, otp }, req) {
  const row = await verifyOtp({ email, purpose: 'SIGNUP', code: otp }, req);
  try {
    const citizen = await Citizen.create({
      email,
      fullName: row.payload?.name ?? email,
      status: 'PROFILE_PENDING',
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    });
    await audit(req, { event: 'SIGNUP_SUCCESS', email, actorType: 'CITIZEN' });
    return citizen;
  } catch (e) {
    if (e?.code === 11000) throw new ApiError(400, 'OTP_INVALID', 'That code is not valid. Please request a new one.');
    throw e;
  }
}

export async function verifyLogin({ email, otp }, req) {
  const row = await verifyOtp({ email, purpose: 'LOGIN', code: otp }, req);
  void row;
  const citizen = await Citizen.findOne({ email });
  if (!citizen) throw new ApiError(400, 'OTP_INVALID', 'That code is not valid. Please request a new one.');
  if (citizen.status === 'SUSPENDED') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended.');
  citizen.lastLoginAt = new Date();
  await citizen.save();
  await audit(req, { event: 'LOGIN_SUCCESS', email, actorType: 'CITIZEN' });
  return citizen;
}

/** Staff email + password with 5-strikes / 15-minute lockout (FR-A11, FR-A12). */
export async function staffLogin({ email, password }, req) {
  const staff = await Staff.findOne({ email }).select('+passwordHash');
  if (!staff) {
    await bcrypt.compare(password, DUMMY_HASH);
    await audit(req, { event: 'STAFF_LOGIN_FAIL', email, actorType: 'STAFF', success: false });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (staff.lockedUntil && staff.lockedUntil.getTime() > Date.now()) {
    await audit(req, { event: 'STAFF_LOGIN_BLOCKED', email, actorType: 'STAFF', success: false });
    throw new ApiError(
      423,
      'ACCOUNT_LOCKED',
      'Too many failed attempts. Try again later.',
      undefined,
      Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 1000),
    );
  }
  const ok = await bcrypt.compare(password, staff.passwordHash);
  if (!ok) {
    staff.failedAttempts += 1;
    if (staff.failedAttempts >= MAX_FAILED) {
      staff.lockedUntil = new Date(Date.now() + LOCK_MS);
      staff.failedAttempts = 0;
      await audit(req, { event: 'STAFF_LOCKED', email, actorType: 'STAFF', success: false });
    }
    await staff.save();
    await audit(req, { event: 'STAFF_LOGIN_FAIL', email, actorType: 'STAFF', success: false });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (!staff.enabled) throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account has been disabled.');
  staff.failedAttempts = 0;
  staff.lockedUntil = undefined;
  staff.lastLoginAt = new Date();
  await staff.save();
  await audit(req, { event: 'STAFF_LOGIN_SUCCESS', email, actorType: 'STAFF' });
  return staff;
}
