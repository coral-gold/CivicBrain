package com.civicbrain.citizen;

import com.civicbrain.admin.Role;
import com.civicbrain.auth.AuthDtos.UserDto;
import com.civicbrain.auth.AuthDtos.UserResponse;
import com.civicbrain.common.ApiException;
import com.civicbrain.security.AuthPrincipal;
import com.civicbrain.security.SessionCookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/citizen")
public class CitizenProfileController {
    private final CitizenRepository citizens;
    private final SessionCookie cookie;

    public CitizenProfileController(CitizenRepository citizens, SessionCookie cookie) {
        this.citizens = citizens;
        this.cookie = cookie;
    }

    @PutMapping("/profile")
    @Transactional
    public UserResponse save(@AuthenticationPrincipal AuthPrincipal p, @Valid @RequestBody ProfileRequest b,
                             HttpServletResponse res) {
        Citizen c = citizens.findById(p.id()).orElseThrow(ApiException::notFound);
        if (citizens.existsByPhoneAndIdNot(b.phone(), c.getId())) throw phoneInUse();
        c.setFullName(b.fullName().trim());
        c.setPhone(b.phone());
        c.setGender(b.gender());
        c.setDateOfBirth(b.dateOfBirth());
        c.setWardNumber(b.wardNumber());
        c.setStatus(AccountStatus.ACTIVE);
        c.setUpdatedAt(Instant.now());
        try {
            citizens.saveAndFlush(c);
        } catch (DataIntegrityViolationException e) {   // race with another signup using the same number
            throw phoneInUse();
        }
        cookie.write(res, c.getId(), Role.CITIZEN, true);
        return new UserResponse(UserDto.of(c));
    }

    private static ApiException phoneInUse() {
        return new ApiException(HttpStatus.CONFLICT, "PHONE_IN_USE", "This contact number is already registered.",
                Map.of("phone", "This contact number is already registered."), null);
    }
}
