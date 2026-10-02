package com.civicbrain.security;

import com.civicbrain.admin.Role;
import com.civicbrain.config.AppProperties;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** FR-A10: HttpOnly; SameSite=Lax; Secure session cookie. */
@Component
public class SessionCookie {
    public static final String NAME = "cb_session";
    private final JwtService jwt;
    private final boolean secure;

    public SessionCookie(JwtService jwt, AppProperties props) {
        this.jwt = jwt;
        this.secure = props.cookieSecure();
    }

    public void write(HttpServletResponse res, long id, Role role, boolean profileComplete) {
        String token = jwt.issue(id, role, profileComplete);
        res.addHeader(HttpHeaders.SET_COOKIE, base(token).maxAge(jwt.ttl(role)).build().toString());
    }

    public void clear(HttpServletResponse res) {
        res.addHeader(HttpHeaders.SET_COOKIE, base("").maxAge(0).build().toString());
    }

    public static String read(HttpServletRequest req) {
        if (req.getCookies() == null) return null;
        for (Cookie c : req.getCookies()) if (NAME.equals(c.getName())) return c.getValue();
        return null;
    }

    private ResponseCookie.ResponseCookieBuilder base(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Lax").path("/");
    }
}
