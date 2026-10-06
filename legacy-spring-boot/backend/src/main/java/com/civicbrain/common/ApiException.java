package com.civicbrain.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

/** Business error with a stable machine-readable {@code code} (see SRS §6.2). */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fieldErrors;
    private final Long retryAfterSeconds;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, null, null);
    }

    public ApiException(HttpStatus status, String code, String message,
                        Map<String, String> fieldErrors, Long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public static ApiException validation(String field, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Please correct the highlighted fields.",
                Map.of(field, message), null);
    }

    public static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Not found.");
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public Map<String, String> fieldErrors() { return fieldErrors; }
    public Long retryAfterSeconds() { return retryAfterSeconds; }
}
