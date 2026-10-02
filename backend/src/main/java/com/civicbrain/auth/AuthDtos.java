package com.civicbrain.auth;

import com.civicbrain.admin.Admin;
import com.civicbrain.citizen.Citizen;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public final class AuthDtos {
    private AuthDtos() {}

    public record SignupRequest(
            @NotBlank(message = "Name is required") @Size(min = 2, max = 100, message = "Name must be 2–100 characters") String name,
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address")
            @Size(max = 254) String email) {}

    public record EmailRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address")
            @Size(max = 254) String email) {}

    public record VerifyRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
            @NotBlank(message = "Code is required") @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code") String otp) {}

    public record AdminLoginRequest(
            @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
            @NotBlank(message = "Password is required") @Size(max = 128) String password) {}

    public record OtpSentResponse(String message, int resendAfterSeconds, int expiresInSeconds) {}

    public record UserDto(long id, String email, String fullName, String role, boolean profileComplete, String status,
                          String phone, String gender, LocalDate dateOfBirth, Integer wardNumber,
                          Integer assignedWardNumber) {
        public static UserDto of(Citizen c) {
            return new UserDto(c.getId(), c.getEmail(), c.getFullName(), "CITIZEN", c.profileComplete(),
                    c.getStatus().name(), c.getPhone(), c.getGender() == null ? null : c.getGender().name(),
                    c.getDateOfBirth(), c.getWardNumber(), null);
        }

        public static UserDto of(Admin a) {
            return new UserDto(a.getId(), a.getEmail(), a.getFullName(), a.getRole().name(), true, a.getStatus(),
                    null, null, null, null, a.getAssignedWardNumber());
        }
    }

    public record UserResponse(UserDto user) {}
    public record MessageResponse(String message) {}
}
