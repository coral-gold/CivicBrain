package com.civicbrain.citizen;

import com.civicbrain.common.AgeRange;
import com.civicbrain.common.WardNumber;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ProfileRequest(
        @NotBlank(message = "Full name is required")
        @Size(min = 2, max = 100, message = "Full name must be 2–100 characters") String fullName,
        @NotBlank(message = "Contact number is required")
        @Pattern(regexp = "[6-9]\\d{9}", message = "Enter a valid 10-digit Indian mobile number") String phone,
        @NotNull(message = "Select a gender") Gender gender,
        @NotNull(message = "Birthdate is required")
        @AgeRange(min = 13, max = 120, message = "Age must be between 13 and 120") LocalDate dateOfBirth,
        @WardNumber(message = "Choose a valid ward number") Integer wardNumber) {}
