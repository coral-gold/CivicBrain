import { Router } from 'express';
import { requireAuth, requireProfileComplete, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { profileSchema } from '../auth/auth.schemas.js';
import { updateProfile } from './citizen.controller.js';

const r = Router();
r.use(requireAuth, requireRole('CITIZEN'));
// Profile is the one citizen route usable before registration is complete (FR-A5/A7).
r.put('/profile', validate(profileSchema), updateProfile);
// Everything below needs a completed profile (complaint routes arrive in M2).
r.use(requireProfileComplete);
export default r;
