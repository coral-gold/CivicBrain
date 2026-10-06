package com.civicbrain.security;

import com.civicbrain.common.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }   // FR-A7

    @Bean
    SecurityFilterChain chain(HttpSecurity http, JwtAuthFilter jwtFilter, ObjectMapper mapper) throws Exception {
        var citizenWithProfile = new WebExpressionAuthorizationManager(
                "hasRole('CITIZEN') and hasAuthority('" + JwtAuthFilter.PROFILE_COMPLETE + "')");

        http
            // Stateless cookie auth. CSRF is mitigated by SameSite=Lax (cross-site POSTs carry no cookie),
            // JSON/multipart-only write endpoints and no state change on GET.
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(h -> h.frameOptions(f -> f.deny()).contentTypeOptions(c -> {}))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/**", "/api/public/**", "/api/media/**", "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/citizen/profile").hasRole("CITIZEN")
                .requestMatchers("/api/citizen/**").access(citizenWithProfile)
                .requestMatchers(HttpMethod.GET, "/api/admin/wards").hasAnyRole("OFFICER", "ADMIN", "SUPER_ADMIN")
                .requestMatchers("/api/admin/staff/**", "/api/admin/wards/**", "/api/admin/categories/**",
                        "/api/admin/cost-rates/**", "/api/admin/priority-weights/**").hasRole("SUPER_ADMIN")
                .requestMatchers("/api/admin/**").hasAnyRole("OFFICER", "ADMIN", "SUPER_ADMIN")
                .anyRequest().denyAll())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> write(res, mapper, HttpStatus.UNAUTHORIZED,
                        "UNAUTHENTICATED", "Please sign in."))
                .accessDeniedHandler((req, res, ex) -> write(res, mapper, HttpStatus.FORBIDDEN,
                        "FORBIDDEN", "Access denied.")))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void write(jakarta.servlet.http.HttpServletResponse res, ObjectMapper mapper, HttpStatus s,
                              String code, String msg) throws java.io.IOException {
        res.setStatus(s.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), ErrorResponse.of(code, msg));
    }
}
