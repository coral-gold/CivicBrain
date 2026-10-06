import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const CITIZEN_TTL_S = 7 * 24 * 60 * 60; // 7 days
export const STAFF_TTL_S = 8 * 60 * 60; // 8 hours

/**
 * Signs the session JWT (HS256) and sets it as an httpOnly SameSite=Lax cookie (FR-A14).
 * The token is never exposed to JavaScript and never stored in localStorage.
 * @param {import('express').Response} res
 * @param {{ id: string, role: string, name: string, profileComplete: boolean }} who
 */
export function issueSession(res, who) {
  const ttl = who.role === 'CITIZEN' ? CITIZEN_TTL_S : STAFF_TTL_S;
  const token = jwt.sign({ sub: String(who.id), role: who.role, name: who.name, pc: who.profileComplete }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ttl,
  });
  res.cookie(env.COOKIE_NAME, token, cookieOptions(ttl * 1000));
}

export function clearSession(res) {
  res.clearCookie(env.COOKIE_NAME, cookieOptions());
}

/** @returns {import('jsonwebtoken').JwtPayload | null} */
export function verifyToken(token) {
  try {
    return /** @type {any} */ (jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }));
  } catch {
    return null;
  }
}

function cookieOptions(maxAge) {
  return { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', path: '/', ...(maxAge ? { maxAge } : {}) };
}
