package com.civicbrain.auth;

import com.civicbrain.common.ApiException;
import com.civicbrain.common.SlidingWindowRateLimiter;
import java.time.Clock;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AuthRateLimiters {
    private final SlidingWindowRateLimiter adminLoginPerIp;   // FR-A8: 10 / 15 min
    private final SlidingWindowRateLimiter otpRequestPerIp;
    private final SlidingWindowRateLimiter otpVerifyPerIp;

    public AuthRateLimiters(Clock clock) {
        adminLoginPerIp = new SlidingWindowRateLimiter(10, Duration.ofMinutes(15), clock);
        otpRequestPerIp = new SlidingWindowRateLimiter(20, Duration.ofHours(1), clock);
        otpVerifyPerIp = new SlidingWindowRateLimiter(30, Duration.ofMinutes(15), clock);
    }

    public void adminLogin(String ip) { check(adminLoginPerIp, ip); }
    public void otpRequest(String ip) { check(otpRequestPerIp, ip); }
    public void otpVerify(String ip) { check(otpVerifyPerIp, ip); }

    public void resetAll() {
        adminLoginPerIp.reset();
        otpRequestPerIp.reset();
        otpVerifyPerIp.reset();
    }

    private static void check(SlidingWindowRateLimiter l, String ip) {
        long wait = l.tryAcquire(ip);
        if (wait > 0) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                "Too many requests. Please try again later.", null, wait);
    }
}
