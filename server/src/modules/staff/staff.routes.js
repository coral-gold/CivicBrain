import { Router } from 'express';
import { requireAuth, requireRole, STAFF_ROLES } from '../../middleware/auth.js';

const r = Router();
r.use(requireAuth, requireRole(...STAFF_ROLES));

// Placeholder until M3 (queue). Exists so the role guard is exercised end to end.
r.get('/complaints', (req, res) => res.json({ items: [], page: 1, limit: 20, total: 0 }));
export default r;
