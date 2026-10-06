import { ApiError } from '../utils/ApiError.js';

/**
 * Validates `req[source]` with a zod schema; replaces it with the parsed (stripped, coerced) value.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source]
 */
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const r = schema.safeParse(req[source] ?? {});
    if (!r.success) {
      const fieldErrors = {};
      for (const issue of r.error.issues) {
        const key = issue.path.join('.') || '_';
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', fieldErrors));
    }
    req[source] = r.data;
    return next();
  };
