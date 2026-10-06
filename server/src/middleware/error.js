import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/** 404 for unknown /api routes. */
export function notFound(req, res, next) {
  next(ApiError.notFound());
}

/**
 * Central error handler: every error leaves as `{ code, message, fieldErrors?, retryAfterSeconds? }`.
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    if (err.retryAfterSeconds) res.set('Retry-After', String(err.retryAfterSeconds));
    return res.status(err.status).json(body(err.code, err.message, err.fieldErrors, err.retryAfterSeconds));
  }
  if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json(body('VALIDATION_ERROR', 'The request body is not valid JSON.'));
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json(body('VALIDATION_ERROR', 'The request is too large.'));
  }
  logger.error({ err: { message: err?.message, stack: err?.stack }, path: req.path }, 'Unhandled error');
  return res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
}

function body(code, message, fieldErrors, retryAfterSeconds) {
  const o = { code, message };
  if (fieldErrors) o.fieldErrors = fieldErrors;
  if (retryAfterSeconds) o.retryAfterSeconds = retryAfterSeconds;
  return o;
}
