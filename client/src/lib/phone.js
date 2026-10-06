/** Mirrors server/src/utils/phone.js: normalises an Indian mobile to 10 digits, or returns null. */
export function normalizeIndianMobile(input) {
  if (typeof input !== 'string') return null;
  let s = input.replace(/[\s-]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (/^91\d{10}$/.test(s)) s = s.slice(2);
  else if (/^0\d{10}$/.test(s)) s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}
