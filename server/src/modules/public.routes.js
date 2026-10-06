import { Router } from 'express';
import { Ward } from '../models/Ward.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { OTP_RESEND_S, OTP_TTL_S } from './auth/otp.service.js';

const r = Router();
r.get(
  '/config',
  asyncHandler(async (req, res) => {
    const wards = await Ward.find().sort({ number: 1 }).select('number name -_id').lean();
    res.json({ wards, otpResendSeconds: OTP_RESEND_S, otpTtlSeconds: OTP_TTL_S });
  }),
);
export default r;
