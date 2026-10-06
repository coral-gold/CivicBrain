import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { Otp } from '../../models/Otp.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { audit } from './audit.js';

export const OTP_TTL_S = 300; // 5 minutes
export const OTP_RESEND_S = 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;

/** HMAC-SHA256(OTP_PEPPER, email|purpose|code). Purpose is part of the input, so SIGNUP and LOGIN codes never interchange. */
function hash(email, purpose, code) {
  return crypto.createHmac('sha256', env.OTP_PEPPER).update(`${email}|${purpose}|${code}`).digest('hex');
}

/**
 * Creates an OTP (FR-A2). When `deliver` is false (unknown email on login / registered email on signup) a
 * consumed decoy row is stored instead, so cooldown and hourly limits behave identically and nothing leaks.
 * @returns {Promise<string | null>} the plaintext code when deliver is true (caller emails it), else null
 */
export async function issueOtp({ email, purpose, payload, deliver }, req) {
  const now = Date.now();

  const last = await Otp.findOne({ email }).sort({ createdAt: -1 });
  if (last) {
    const wait = Math.ceil(OTP_RESEND_S - (now - last.createdAt.getTime()) / 1000);
    if (wait > 0) throw new ApiError(429, 'OTP_COOLDOWN', 'Please wait before requesting another code.', undefined, wait);
  }
  const windowStart = new Date(now - 3600 * 1000);
  const recent = await Otp.find({ email, createdAt: { $gt: windowStart } })
    .sort({ createdAt: 1 })
    .select('createdAt');
  if (recent.length >= OTP_MAX_PER_HOUR) {
    const retry = Math.ceil((recent[0].createdAt.getTime() + 3600 * 1000 - now) / 1000);
    throw new ApiError(429, 'RATE_LIMITED', 'Too many codes requested. Please try again later.', undefined, Math.max(1, retry));
  }

  await Otp.updateMany({ email, purpose, consumed: false }, { consumed: true }); // new code invalidates the old one
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await Otp.create({
    email,
    purpose,
    codeHash: hash(email, purpose, code),
    payload,
    expiresAt: new Date(now + OTP_TTL_S * 1000),
    consumed: !deliver,
    ip: req.ip,
  });
  if (!deliver) return null;
  await audit(req, { event: 'OTP_SENT', email, actorType: 'CITIZEN' });
  if (env.OTP_DEV_LOG) logger.warn(`[DEV ONLY] OTP for ${email} (${purpose}): ${code}`);
  return code;
}

/**
 * Verifies and consumes the active OTP. Wrong guesses are counted; the 5th locks the code (FR-A2).
 * @returns {Promise<import('mongoose').Document & { payload?: { name?: string } }>} the consumed OTP row
 */
export async function verifyOtp({ email, purpose, code }, req) {
  const fail = async (status, errCode, message) => {
    await audit(req, { event: 'OTP_VERIFY_FAIL', email, actorType: 'CITIZEN', success: false });
    return new ApiError(status, errCode, message);
  };

  const otp = await Otp.findOne({ email, purpose, consumed: false }).sort({ createdAt: -1 });
  if (!otp) throw await fail(400, 'OTP_INVALID', 'That code is not valid. Please request a new one.');
  if (otp.expiresAt.getTime() < Date.now()) {
    otp.consumed = true;
    await otp.save();
    throw await fail(400, 'OTP_EXPIRED', 'That code has expired. Please request a new one.');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw await fail(429, 'OTP_LOCKED', 'Too many wrong attempts. Please request a new code.');

  const given = Buffer.from(hash(email, purpose, code));
  const stored = Buffer.from(otp.codeHash);
  if (!(given.length === stored.length && crypto.timingSafeEqual(given, stored))) {
    otp.attempts += 1;
    await otp.save();
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw await fail(429, 'OTP_LOCKED', 'Too many wrong attempts. Please request a new code.');
    throw await fail(400, 'OTP_INCORRECT', `Incorrect code. ${OTP_MAX_ATTEMPTS - otp.attempts} attempts left.`);
  }
  otp.consumed = true; // single use
  await otp.save();
  await audit(req, { event: 'OTP_VERIFY_SUCCESS', email, actorType: 'CITIZEN' });
  return otp;
}
