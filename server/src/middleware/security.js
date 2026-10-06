import { ApiError } from '../utils/ApiError.js';

/**
 * Mutating requests must carry a JSON or multipart body (SRS §8.1). With SameSite=Lax cookies this stops
 * simple cross-site form posts (which can only send urlencoded / text/plain).
 */
export function requireJsonOrMultipart(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.is(['json', 'multipart/form-data'])) {
    return next(new ApiError(415, 'VALIDATION_ERROR', 'Content-Type must be application/json or multipart/form-data.'));
  }
  return next();
}

function hasBadKey(value, depth = 0) {
  if (value === null || typeof value !== 'object' || depth > 8) return false;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) return true;
    if (hasBadKey(value[key], depth + 1)) return true;
  }
  return false;
}

/** Rejects NoSQL-operator injection: any key starting with "$" or containing "." in body/query/params. */
export function rejectMongoOperators(req, res, next) {
  if (hasBadKey(req.body) || hasBadKey(req.query) || hasBadKey(req.params)) {
    return next(new ApiError(400, 'VALIDATION_ERROR', 'The request contains invalid characters.'));
  }
  return next();
}
