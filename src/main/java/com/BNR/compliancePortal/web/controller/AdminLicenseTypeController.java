package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.service.LicenseTypeService;
import com.BNR.compliancePortal.web.dto.LicenseTypeDtos.CreateLicenseTypeRequest;
import com.BNR.compliancePortal.web.dto.LicenseTypeDtos.LicenseTypeResponse;
import com.BNR.compliancePortal.web.dto.LicenseTypeDtos.SetLicenseTypeEnabledRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/license-types")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminLicenseTypeController {

    private final LicenseTypeService licenseTypeService;

    public AdminLicenseTypeController(LicenseTypeService licenseTypeService) {
        this.licenseTypeService = licenseTypeService;
    }

    @GetMapping
    public ResponseEntity<List<LicenseTypeResponse>> listAll() {
        return ResponseEntity.ok(licenseTypeService.listAll());
    }

    @PostMapping
    public ResponseEntity<LicenseTypeResponse> create(@Valid @RequestBody CreateLicenseTypeRequest payload) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            licenseTypeService.create(payload.code(), payload.label()));
    }

    @PatchMapping("/{id}/enabled")
    public ResponseEntity<LicenseTypeResponse> setEnabled(
        @PathVariable Long id,
        @Valid @RequestBody SetLicenseTypeEnabledRequest payload) {
        return ResponseEntity.ok(licenseTypeService.setEnabled(id, payload.enabled()));
    }
}
