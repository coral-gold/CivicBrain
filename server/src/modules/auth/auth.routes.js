import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { otpRequestLimiter, otpVerifyLimiter, staffLoginLimiter } from '../../middleware/rateLimits.js';
import { validate } from '../../middleware/validate.js';
import * as c from './auth.controller.js';
import { emailOnlySchema, signupRequestSchema, staffLoginSchema, verifySchema } from './auth.schemas.js';

const r = Router();
r.post('/signup/request-otp', otpRequestLimiter, validate(signupRequestSchema), c.signupRequestOtp);
r.post('/signup/verify', otpVerifyLimiter, validate(verifySchema), c.signupVerify);
r.post('/login/request-otp', otpRequestLimiter, validate(emailOnlySchema), c.loginRequestOtp);
r.post('/login/verify', otpVerifyLimiter, validate(verifySchema), c.loginVerify);
r.post('/staff/login', staffLoginLimiter, validate(staffLoginSchema), c.staffLogin);
r.get('/me', requireAuth, c.me);
r.post('/logout', c.logout);
export default r;
