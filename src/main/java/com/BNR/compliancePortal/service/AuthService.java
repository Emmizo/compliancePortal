package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.auditService = auditService;
    }

    @Transactional
    public User registerApplicant(String email, String fullName, String rawPassword) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleViolationException("An account with that email already exists");
        }
        User user = User.builder()
            .email(email.toLowerCase())
            .passwordHash(passwordEncoder.encode(rawPassword))
            .fullName(fullName)
            .role(Role.APPLICANT)
            .enabled(true)
            .build();
        User saved = userRepository.save(user);
        auditService.recordUserAction(saved, AuditService.ACTION_USER_REGISTERED,
            "Self-service applicant registration");
        return saved;
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

    public record LoginResult(String token, long expiresInSeconds, User user) {}
}
