/**
 * Post-login redirect target. Only same-site relative paths starting with a single "/" are honoured
 * (FR-A9); absolute URLs, "//host", "/\host" and control characters fall back to the default.
 * @param {string | null | undefined} next
 * @param {string} [fallback]
 */
export function safeNext(next, fallback = '/dashboard') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    return new URL(next, 'http://placeholder.invalid').origin === 'http://placeholder.invalid' ? next : fallback;
  } catch {
    return fallback;
  }
}
