import { env } from '../config/env.js';
import { Citizen } from '../models/Citizen.js';
import { Staff } from '../models/Staff.js';
import { clearSession, verifyToken } from '../modules/auth/session.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const STAFF_ROLES = ['OFFICER', 'ADMIN', 'SUPER_ADMIN'];

/**
 * Requires a valid session. The account is re-read from the database on every request, so a disabled or
 * suspended account loses access immediately and role changes apply at once (FR-A15).
 * Sets `req.user = { id, role, name, email, profileComplete, assignedWard }`.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
  const payload = verifyToken(token);
  if (!payload?.sub) {
    clearSession(res);
    throw new ApiError(401, 'SESSION_INVALID', 'Your session is no longer valid. Please sign in again.');
  }
  let user = null;
  const isCitizen = payload.role === 'CITIZEN';
  if (/^[a-f0-9]{24}$/.test(String(payload.sub))) {
    if (isCitizen) {
      const c = await Citizen.findById(payload.sub);
      if (c && c.status !== 'SUSPENDED') {
        user = { id: String(c._id), role: 'CITIZEN', name: c.fullName, email: c.email, profileComplete: c.status === 'ACTIVE', assignedWard: null };
      }
    } else {
      const s = await Staff.findById(payload.sub);
      if (s && s.enabled) {
        user = { id: String(s._id), role: s.role, name: s.fullName, email: s.email, profileComplete: true, assignedWard: s.assignedWard ?? null };
      }
    }
  }
  if (!user) {
    clearSession(res);
    throw new ApiError(401, 'SESSION_INVALID', 'Your session is no longer valid. Please sign in again.');
  }
  req.user = user;
  next();
});

/** @param {...string} roles allowed roles; others get 403 FORBIDDEN */
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'FORBIDDEN', 'You do not have access to this.'));

/** Citizens must finish registration before using citizen APIs. */
export function requireProfileComplete(req, res, next) {
  return req.user?.profileComplete ? next() : next(new ApiError(403, 'FORBIDDEN', 'Please complete your registration details first.'));
}
