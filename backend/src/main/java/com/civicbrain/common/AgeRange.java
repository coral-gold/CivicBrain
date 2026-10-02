package com.civicbrain.common;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.*;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneOffset;

/** Age (in whole years) must lie in [min, max]; FR-A4 uses 13–120. */
@Documented
@Constraint(validatedBy = AgeRange.Validator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AgeRange {
    int min() default 13;
    int max() default 120;
    String message() default "Age must be between 13 and 120";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<AgeRange, LocalDate> {
        private int min, max;
        @Override public void initialize(AgeRange a) { min = a.min(); max = a.max(); }

        @Override
        public boolean isValid(LocalDate dob, ConstraintValidatorContext c) {
            if (dob == null) return false;
            LocalDate today = LocalDate.now(Clock.systemUTC().withZone(ZoneOffset.UTC));
            if (dob.isAfter(today)) return false;
            int age = Period.between(dob, today).getYears();
            return age >= min && age <= max;
        }
    }
}
