import { Citizen } from '../../models/Citizen.js';
import { Staff } from '../../models/Staff.js';
import { ApiError } from '../../utils/ApiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './auth.service.js';
import { clearSession, issueSession } from './session.js';
import { citizenDto, staffDto } from './user.dto.js';

export const signupRequestOtp = asyncHandler(async (req, res) => res.json(await service.requestSignupOtp(req.body, req)));
export const loginRequestOtp = asyncHandler(async (req, res) => res.json(await service.requestLoginOtp(req.body, req)));

export const signupVerify = asyncHandler(async (req, res) => {
  const c = await service.verifySignup(req.body, req);
  issueSession(res, { id: c._id, role: 'CITIZEN', name: c.fullName, profileComplete: false });
  res.json({ user: citizenDto(c) });
});

export const loginVerify = asyncHandler(async (req, res) => {
  const c = await service.verifyLogin(req.body, req);
  issueSession(res, { id: c._id, role: 'CITIZEN', name: c.fullName, profileComplete: c.status === 'ACTIVE' });
  res.json({ user: citizenDto(c) });
});

export const staffLogin = asyncHandler(async (req, res) => {
  const s = await service.staffLogin(req.body, req);
  issueSession(res, { id: s._id, role: s.role, name: s.fullName, profileComplete: true });
  res.json({ user: staffDto(s) });
});

/** Re-reads the database (requireAuth already did); returns the fresh user. */
export const me = asyncHandler(async (req, res) => {
  if (req.user.role === 'CITIZEN') return res.json({ user: citizenDto(await Citizen.findById(req.user.id)) });
  const s = await Staff.findById(req.user.id);
  if (!s) throw new ApiError(401, 'SESSION_INVALID', 'Your session is no longer valid.');
  return res.json({ user: staffDto(s) });
});

export const logout = (req, res) => {
  clearSession(res);
  res.json({ message: 'Signed out.' });
};
