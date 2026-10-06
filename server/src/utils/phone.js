/**
 * Normalises an Indian mobile number to 10 digits (accepts +91 / 91 / 0 prefixes, spaces and dashes).
 * @param {unknown} input
 * @returns {string | null} 10-digit number starting 6–9, or null if invalid
 */
export function normalizeIndianMobile(input) {
  if (typeof input !== 'string') return null;
  let s = input.replace(/[\s-]/g, '');
  if (s.startsWith('+91')) s = s.slice(3);
  else if (/^91\d{10}$/.test(s)) s = s.slice(2);
  else if (/^0\d{10}$/.test(s)) s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? s : null;
}

/** 98xxxxxx10 – used when staff view a citizen (SRS §5.4). */
export function maskPhone(phone) {
  return phone && phone.length === 10 ? `${phone.slice(0, 2)}xxxxxx${phone.slice(8)}` : null;
}
