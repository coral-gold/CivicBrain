package com.civicbrain.common;

import com.civicbrain.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class ClientIp {
    private final boolean trustProxy;

    public ClientIp(AppProperties props) { this.trustProxy = props.trustProxy(); }

    public String of(HttpServletRequest req) {
        if (trustProxy) {
            String xff = req.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    public static String userAgent(HttpServletRequest req) {
        String ua = req.getHeader("User-Agent");
        return ua == null ? null : ua.substring(0, Math.min(ua.length(), 300));
    }
}
