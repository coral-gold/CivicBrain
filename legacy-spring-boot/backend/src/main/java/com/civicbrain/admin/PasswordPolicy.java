package com.civicbrain.admin;

import com.civicbrain.common.ApiException;

/** FR-A9: at least 12 chars with upper, lower, digit and symbol. */
public final class PasswordPolicy {
    private PasswordPolicy() {}

    public static boolean isValid(String p) {
        if (p == null || p.length() < 12 || p.length() > 128) return false;
        boolean up = false, lo = false, di = false, sy = false;
        for (char c : p.toCharArray()) {
            if (Character.isUpperCase(c)) up = true;
            else if (Character.isLowerCase(c)) lo = true;
            else if (Character.isDigit(c)) di = true;
            else sy = true;
        }
        return up && lo && di && sy;
    }

    public static void require(String p, String field) {
        if (!isValid(p)) throw ApiException.validation(field,
                "Use at least 12 characters with upper-case, lower-case, a digit and a symbol.");
    }
}
