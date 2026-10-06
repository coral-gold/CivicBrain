import { AuditLog } from '../../models/AuditLog.js';
import { logger } from '../../utils/logger.js';

/**
 * Records an auth event with IP and user agent (FR-A17). Never throws.
 * @param {import('express').Request} req
 * @param {{ event: string, email?: string, actorType?: 'CITIZEN'|'STAFF'|'ANONYMOUS', success?: boolean }} e
 */
export async function audit(req, { event, email, actorType = 'ANONYMOUS', success = true }) {
  try {
    await AuditLog.create({
      event,
      email,
      actorType,
      success,
      ip: req.ip,
      userAgent: String(req.get('user-agent') ?? '').slice(0, 300),
    });
  } catch (e) {
    logger.error({ error: e?.message }, 'audit log write failed');
  }
}
