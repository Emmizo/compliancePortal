package com.BNR.compliancePortal.web.dto;

import com.BNR.compliancePortal.domain.AuditLog;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class AdminDtos {

    private AdminDtos() {}

    public record CreateUserRequest(
        @NotBlank @Email                  String email,
        @NotBlank                         String fullName,
        @NotBlank @Size(min = 8, max=128) String password,
        @NotNull                          Role role
    ) {}

    public record ChangeRoleRequest(
        @NotNull Role role
    ) {}

    public record UserResponse(
        Long id,
        String email,
        String fullName,
        Role role,
        boolean enabled,
        Instant createdAt
    ) {
        public static UserResponse from(User u) {
            return new UserResponse(u.getId(), u.getEmail(), u.getFullName(),
                u.getRole(), u.isEnabled(), u.getCreatedAt());
        }
    }

    public record AuditLogResponse(
        Long id,
        Instant occurredAt,
        Long actingUserId,
        String actingUserFullName,
        String actingUserEmail,
        Long applicationId,
        String action,
        String stateBefore,
        String stateAfter,
        String notes
    ) {
        public static AuditLogResponse from(AuditLog log, User actingUser) {
            String fullName = actingUser != null
                ? actingUser.getFullName()
                : "Unknown user (id " + log.getActingUserId() + ")";
            String email = actingUser != null ? actingUser.getEmail() : null;
            return new AuditLogResponse(
                log.getId(),
                log.getOccurredAt(),
                log.getActingUserId(),
                fullName,
                email,
                log.getApplicationId(),
                log.getAction(),
                log.getStateBefore(),
                log.getStateAfter(),
                log.getNotes());
        }

        public static AuditLogResponse from(AuditLog log) {
            return from(log, null);
        }
    }
}
