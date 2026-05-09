package com.BNR.compliancePortal.web.dto;

import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

    public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank String fullName,
        @NotBlank @Size(min = 8, max = 128) String password
    ) {}

    public record AuthenticatedUserResponse(
        Long id,
        String email,
        String fullName,
        Role role
    ) {
        public static AuthenticatedUserResponse from(User user) {
            return new AuthenticatedUserResponse(
                user.getId(), user.getEmail(), user.getFullName(), user.getRole());
        }
    }

    public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        AuthenticatedUserResponse user
    ) {}
}
