import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

function limiter(windowMs, limit) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip,
    handler: (req, res, next) => {
      const retry = Math.max(1, Math.ceil(((req.rateLimit?.resetTime?.getTime?.() ?? Date.now() + windowMs) - Date.now()) / 1000));
      next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please try again later.', undefined, retry));
    },
  });
}

// SRS §8.1. In-memory store: fine for one instance; use a shared store before scaling out.
export const otpRequestLimiter = limiter(60 * 60 * 1000, 20); // 20 / hour / IP
export const otpVerifyLimiter = limiter(15 * 60 * 1000, 30); // 30 / 15 min / IP
export const staffLoginLimiter = limiter(15 * 60 * 1000, 10); // 10 / 15 min / IP
