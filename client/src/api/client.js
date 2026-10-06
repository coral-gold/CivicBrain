import axios from 'axios';

/**
 * The only HTTP client in the app (SRS §12). Same-origin `/api`, cookies sent automatically; the session
 * token is an httpOnly cookie and is never visible to (or stored by) JavaScript.
 */
export const http = axios.create({ baseURL: '/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } });

/** Error with the server's stable `code`, `fieldErrors` and `retryAfterSeconds`. */
export class ApiError extends Error {
  constructor(status, body) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors;
    this.retryAfterSeconds = body.retryAfterSeconds;
  }
}

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      const b = err.response.data ?? {};
      return Promise.reject(
        new ApiError(err.response.status, {
          code: b.code ?? 'INTERNAL_ERROR',
          message: b.message ?? 'Something went wrong. Please try again.',
          fieldErrors: b.fieldErrors,
          retryAfterSeconds: b.retryAfterSeconds,
        }),
      );
    }
    return Promise.reject(new ApiError(0, { code: 'NETWORK', message: 'Network problem. Check your connection and try again.' }));
  },
);

/** Unwraps `res.data`. Bodyless POSTs send `{}` so the Content-Type is always JSON (server requires it). */
export const get = async (url, params) => (await http.get(url, { params })).data;
export const post = async (url, data = {}) => (await http.post(url, data)).data;
export const put = async (url, data = {}) => (await http.put(url, data)).data;
