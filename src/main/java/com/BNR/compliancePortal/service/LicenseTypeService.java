package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.LicenseType;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.exception.ResourceNotFoundException;
import com.BNR.compliancePortal.repository.LicenseTypeRepository;
import com.BNR.compliancePortal.web.dto.LicenseTypeDtos.LicenseTypeResponse;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LicenseTypeService {

    private static final Pattern CODE_NORMALIZED = Pattern.compile("^[A-Z0-9_]{2,64}$");

    private final LicenseTypeRepository licenseTypeRepository;

    public LicenseTypeService(LicenseTypeRepository licenseTypeRepository) {
        this.licenseTypeRepository = licenseTypeRepository;
    }

    @Transactional(readOnly = true)
    public List<LicenseTypeResponse> listActive() {
        return licenseTypeRepository.findAllByEnabledTrueOrderByLabelAsc().stream()
            .map(LicenseTypeResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<LicenseTypeResponse> listAll() {
        return licenseTypeRepository.findAllByOrderByLabelAsc().stream()
            .map(LicenseTypeResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public String requireActiveCode(String rawCode) {
        String code = normalizeCode(rawCode);
        LicenseType row = licenseTypeRepository.findByCodeIgnoreCase(code)
            .orElseThrow(() -> new BusinessRuleViolationException(
                "Unknown license type. Choose a type from the list or ask an administrator to add it."));
        if (!row.isEnabled()) {
            throw new BusinessRuleViolationException("This license type is not available for new applications.");
        }
        return row.getCode();
    }

    @Transactional
    public LicenseTypeResponse create(String rawCode, String label) {
        String code = normalizeCode(rawCode);
        if (!CODE_NORMALIZED.matcher(code).matches()) {
            throw new BusinessRuleViolationException(
                "License type code must be 2–64 characters (letters, digits, underscores).");
        }
        if (licenseTypeRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessRuleViolationException("A license type with that code already exists.");
        }
        String trimmedLabel = label.strip();
        if (trimmedLabel.length() < 2) {
            throw new BusinessRuleViolationException("Display label is required.");
        }
        LicenseType saved = licenseTypeRepository.save(LicenseType.builder()
            .code(code)
            .label(trimmedLabel)
            .enabled(true)
            .build());
        return LicenseTypeResponse.from(saved);
    }

    @Transactional
    public LicenseTypeResponse setEnabled(Long id, boolean enabled) {
        LicenseType row = licenseTypeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("License type " + id + " not found"));
        row.setEnabled(enabled);
        return LicenseTypeResponse.from(licenseTypeRepository.save(row));
    }

    private static String normalizeCode(String proposedCode) {
        if (proposedCode == null) {
            return "";
        }
        return proposedCode.strip().toUpperCase();
    }
}
