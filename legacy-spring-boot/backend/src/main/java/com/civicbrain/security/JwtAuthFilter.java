package com.civicbrain.security;

import com.civicbrain.admin.AdminRepository;
import com.civicbrain.admin.Role;
import com.civicbrain.citizen.AccountStatus;
import com.civicbrain.citizen.CitizenRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Verifies the session cookie and re-reads the account on every request, so suspended or disabled
 * accounts lose access immediately (FR-A13) instead of when the JWT expires.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    public static final String PROFILE_COMPLETE = "PROFILE_COMPLETE";
    private final JwtService jwt;
    private final CitizenRepository citizens;
    private final AdminRepository admins;

    public JwtAuthFilter(JwtService jwt, CitizenRepository citizens, AdminRepository admins) {
        this.jwt = jwt;
        this.citizens = citizens;
        this.admins = admins;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String token = SessionCookie.read(req);
        if (token != null) {
            jwt.parse(token).flatMap(this::load).ifPresent(p -> {
                List<GrantedAuthority> auth = new ArrayList<>();
                auth.add(new SimpleGrantedAuthority("ROLE_" + p.role().name()));
                if (p.profileComplete()) auth.add(new SimpleGrantedAuthority(PROFILE_COMPLETE));
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(p, null, auth));
            });
        }
        chain.doFilter(req, res);
    }

    private Optional<AuthPrincipal> load(JwtService.Parsed t) {
        if (t.role() == Role.CITIZEN) {
            return citizens.findById(t.id())
                    .filter(c -> c.getStatus() != AccountStatus.SUSPENDED)
                    .map(c -> new AuthPrincipal(c.getId(), Role.CITIZEN, c.profileComplete(), null));
        }
        return admins.findById(t.id())
                .filter(a -> a.active() && a.getRole() == t.role())
                .map(a -> new AuthPrincipal(a.getId(), a.getRole(), true, a.getAssignedWardNumber()));
    }
}
