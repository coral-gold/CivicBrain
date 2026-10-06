package com.civicbrain.common;

import com.civicbrain.ward.WardCountProvider;
import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.*;
import org.springframework.stereotype.Component;

@Documented
@Constraint(validatedBy = WardNumber.Validator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface WardNumber {
    String message() default "Choose a valid ward number";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};

    @Component
    class Validator implements ConstraintValidator<WardNumber, Integer> {
        private final WardCountProvider wards;
        public Validator(WardCountProvider wards) { this.wards = wards; }

        @Override
        public boolean isValid(Integer v, ConstraintValidatorContext c) {
            return v != null && v >= 1 && v <= wards.wardCount();
        }
    }
}
