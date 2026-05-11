package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    public LoginResult login(String email, String rawPassword) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, rawPassword));
        } catch (AuthenticationException ex) {
            throw new BadCredentialsException("Invalid email or password");
        }
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        String token = jwtService.issueToken(user);
        auditService.recordUserAction(user, AuditService.ACTION_USER_LOGIN, null);
        return new LoginResult(token, jwtService.expirationMinutes() * 60L, user);
    }

    /** Best-effort audit row; client clears JWT afterward so this is the reliable logout marker. */
    @Transactional
    public void recordLogout(User user) {
        auditService.recordUserAction(user, AuditService.ACTION_USER_LOGOUT, null);
    }

    public record LoginResult(String token, long expiresInSeconds, User user) {}
}
