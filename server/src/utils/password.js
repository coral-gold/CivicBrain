/**
 * Staff password policy (FR-A13): at least 12 characters with upper, lower, digit and symbol.
 * @param {unknown} p
 * @returns {boolean}
 */
export function isStrongPassword(p) {
  return typeof p === 'string' && p.length >= 12 && p.length <= 128 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
}

export const PASSWORD_POLICY_MESSAGE = 'Use at least 12 characters with upper-case, lower-case, a digit and a symbol.';
