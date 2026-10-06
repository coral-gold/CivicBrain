/** Business error with a stable machine-readable `code` (SRS §6). */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code stable error code, e.g. OTP_EXPIRED
   * @param {string} message human-readable message
   * @param {Record<string, string>} [fieldErrors]
   * @param {number} [retryAfterSeconds]
   */
  constructor(status, code, message, fieldErrors, retryAfterSeconds) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  static validation(field, message) {
    return new ApiError(400, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', { [field]: message });
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}
