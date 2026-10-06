const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** dd MMM yyyy (SRS §8.3) */
export function formatDate(value) {
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Maps a server error to form state: field errors go to the fields, the rest becomes a banner message. */
export function applyServerError(err, setError) {
  let mapped = 0;
  for (const [field, message] of Object.entries(err?.fieldErrors ?? {})) {
    setError(field, { type: 'server', message });
    mapped += 1;
  }
  if (mapped > 0 && err.code !== 'RATE_LIMITED') return null;
  return err?.message ?? 'Something went wrong. Please try again.';
}
