package com.civicbrain.security;

import com.civicbrain.admin.Role;
import com.civicbrain.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    public static final Duration CITIZEN_TTL = Duration.ofDays(7);
    public static final Duration STAFF_TTL = Duration.ofHours(8);

    private final SecretKey key;
    private final Clock clock;

    public JwtService(AppProperties props, Clock clock) {
        this.key = Keys.hmacShaKeyFor(props.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    public Duration ttl(Role role) { return role.isStaff() ? STAFF_TTL : CITIZEN_TTL; }

    /** The token only identifies the session; authoritative role/status are re-read from the DB per request. */
    public String issue(long id, Role role, boolean profileComplete) {
        Date now = Date.from(clock.instant());
        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("role", role.name())
                .claim("pc", profileComplete)
                .issuedAt(now)
                .expiration(Date.from(clock.instant().plus(ttl(role))))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public record Parsed(long id, Role role) {}

    public Optional<Parsed> parse(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).clock(() -> Date.from(clock.instant())).build()
                    .parseSignedClaims(token).getPayload();
            return Optional.of(new Parsed(Long.parseLong(c.getSubject()), Role.valueOf(c.get("role", String.class))));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
