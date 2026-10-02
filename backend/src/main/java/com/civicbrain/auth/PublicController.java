package com.civicbrain.auth;

import com.civicbrain.otp.OtpService;
import com.civicbrain.ward.WardCountProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    public record PublicConfig(int wardCount, int otpLength, int otpResendSeconds, int otpTtlSeconds) {}

    private final WardCountProvider wards;

    public PublicController(WardCountProvider wards) { this.wards = wards; }

    @GetMapping("/config")
    public PublicConfig config() {
        return new PublicConfig(wards.wardCount(), OtpService.LENGTH, OtpService.RESEND_SECONDS, OtpService.TTL_SECONDS);
    }
}
