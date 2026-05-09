package com.BNR.compliancePortal.web.dto;

import com.BNR.compliancePortal.domain.LicenseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class LicenseTypeDtos {

    private LicenseTypeDtos() {}

    public record LicenseTypeResponse(
        Long id,
        String code,
        String label,
        boolean enabled,
        Instant createdAt
    ) {
        public static LicenseTypeResponse from(LicenseType entity) {
            return new LicenseTypeResponse(
                entity.getId(),
                entity.getCode(),
                entity.getLabel(),
                entity.isEnabled(),
                entity.getCreatedAt());
        }
    }

    public record CreateLicenseTypeRequest(
        @NotBlank @Size(min = 2, max = 64)
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Use letters, digits, or underscores only")
        String code,
        @NotBlank @Size(min = 2, max = 255) String label
    ) {}

    public record SetLicenseTypeEnabledRequest(
        @NotNull Boolean enabled
    ) {}
}
