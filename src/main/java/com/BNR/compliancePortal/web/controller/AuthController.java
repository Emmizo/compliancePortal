package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.security.CurrentUserResolver;
import com.BNR.compliancePortal.service.AuthService;
import com.BNR.compliancePortal.web.dto.AuthDtos.AuthenticatedUserResponse;
import com.BNR.compliancePortal.web.dto.AuthDtos.LoginRequest;
import com.BNR.compliancePortal.web.dto.AuthDtos.LoginResponse;
import com.BNR.compliancePortal.web.dto.AuthDtos.RegisterRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final CurrentUserResolver currentUserResolver;

    public AuthController(AuthService authService, CurrentUserResolver currentUserResolver) {
        this.authService = authService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/me")
    public ResponseEntity<AuthenticatedUserResponse> me() {
        User user = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(AuthenticatedUserResponse.from(user));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticatedUserResponse> register(@Valid @RequestBody RegisterRequest payload) {
        User created = authService.registerApplicant(payload.email(), payload.fullName(), payload.password());
        return ResponseEntity.status(HttpStatus.CREATED).body(AuthenticatedUserResponse.from(created));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest payload) {
        AuthService.LoginResult result = authService.login(payload.email(), payload.password());
        return ResponseEntity.ok(new LoginResponse(
            result.token(),
            "Bearer",
            result.expiresInSeconds(),
            AuthenticatedUserResponse.from(result.user())));
    }
}
