package com.BNR.compliancePortal.security;

import com.BNR.compliancePortal.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_USER_ID = "uid";

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                "app.security.jwt.secret must be at least 32 bytes for HS256");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String issueToken(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(properties.expirationMinutes(), ChronoUnit.MINUTES);
        return Jwts.builder()
            .issuer(properties.issuer())
            .subject(user.getEmail())
            .claim(CLAIM_USER_ID, user.getId())
            .claim(CLAIM_ROLE, user.getRole().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(signingKey)
            .compact();
    }

    public ParsedToken parseAndValidate(String rawToken) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey)
            .requireIssuer(properties.issuer())
            .build()
            .parseSignedClaims(rawToken)
            .getPayload();
        Long uid = claims.get(CLAIM_USER_ID, Long.class);
        String role = claims.get(CLAIM_ROLE, String.class);
        if (uid == null || role == null || claims.getSubject() == null) {
            throw new IllegalArgumentException("Token is missing required claims");
        }
        return new ParsedToken(uid, claims.getSubject(), role);
    }

    public long expirationMinutes() {
        return properties.expirationMinutes();
    }

    public record ParsedToken(Long userId, String email, String role) {}
}
