package com.civicbrain.admin;

import com.civicbrain.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** FR-M1 / FR-A9 / FR-A14: staff accounts are created and managed only by SUPER_ADMIN (URL rule in SecurityConfig). */
@RestController
@RequestMapping("/api/admin/staff")
public class StaffController {
    public record CreateStaff(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 2, max = 100) String fullName,
            @NotNull Role role,
            Integer assignedWardNumber,
            @NotBlank String password) {}

    public record ResetPassword(@NotBlank String password) {}

    public record StaffDto(long id, String email, String fullName, String role, Integer assignedWardNumber,
                           String status) {
        static StaffDto of(Admin a) {
            return new StaffDto(a.getId(), a.getEmail(), a.getFullName(), a.getRole().name(),
                    a.getAssignedWardNumber(), a.getStatus());
        }
    }

    private final AdminRepository admins;
    private final PasswordEncoder encoder;

    public StaffController(AdminRepository admins, PasswordEncoder encoder) {
        this.admins = admins;
        this.encoder = encoder;
    }

    @GetMapping
    public List<StaffDto> list() { return admins.findAll().stream().map(StaffDto::of).toList(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public StaffDto create(@Valid @RequestBody CreateStaff b) {
        if (b.role() == Role.CITIZEN) throw ApiException.validation("role", "Role must be OFFICER, ADMIN or SUPER_ADMIN");
        if (b.role() == Role.OFFICER && b.assignedWardNumber() == null) {
            throw ApiException.validation("assignedWardNumber", "Officers must be assigned to a ward");
        }
        PasswordPolicy.require(b.password(), "password");
        String email = b.email().trim().toLowerCase();
        if (admins.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "A staff account with this email already exists.");
        }
        var a = new Admin();
        a.setEmail(email);
        a.setFullName(b.fullName().trim());
        a.setRole(b.role());
        a.setAssignedWardNumber(b.role() == Role.OFFICER ? b.assignedWardNumber() : null);
        a.setPasswordHash(encoder.encode(b.password()));
        return StaffDto.of(admins.save(a));
    }

    @PostMapping("/{id}/reset-password")
    @Transactional
    public StaffDto resetPassword(@PathVariable long id, @Valid @RequestBody ResetPassword b) {
        PasswordPolicy.require(b.password(), "password");
        Admin a = admins.findById(id).orElseThrow(ApiException::notFound);
        a.setPasswordHash(encoder.encode(b.password()));
        a.setFailedAttempts(0);
        a.setLockedUntil(null);
        a.setUpdatedAt(Instant.now());
        return StaffDto.of(a);
    }

    @PostMapping("/{id}/disable")
    @Transactional
    public StaffDto disable(@PathVariable long id, @org.springframework.security.core.annotation.AuthenticationPrincipal
                            com.civicbrain.security.AuthPrincipal me) {
        if (me.id() == id) throw new ApiException(HttpStatus.CONFLICT, "CONFLICT", "You cannot disable your own account.");
        Admin a = admins.findById(id).orElseThrow(ApiException::notFound);
        a.setStatus("DISABLED");
        return StaffDto.of(a);
    }

    @PostMapping("/{id}/enable")
    @Transactional
    public StaffDto enable(@PathVariable long id) {
        Admin a = admins.findById(id).orElseThrow(ApiException::notFound);
        a.setStatus("ACTIVE");
        return StaffDto.of(a);
    }
}
