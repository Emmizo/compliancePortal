package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.service.LicenseTypeService;
import com.BNR.compliancePortal.web.dto.LicenseTypeDtos.LicenseTypeResponse;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/license-types")
public class LicenseTypeController {

    private final LicenseTypeService licenseTypeService;

    public LicenseTypeController(LicenseTypeService licenseTypeService) {
        this.licenseTypeService = licenseTypeService;
    }

    @GetMapping
    public ResponseEntity<List<LicenseTypeResponse>> listActive() {
        return ResponseEntity.ok(licenseTypeService.listActive());
    }
}
