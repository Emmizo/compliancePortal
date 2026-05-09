package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.LicenseType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LicenseTypeRepository extends JpaRepository<LicenseType, Long> {

    Optional<LicenseType> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<LicenseType> findAllByEnabledTrueOrderByLabelAsc();

    List<LicenseType> findAllByOrderByLabelAsc();
}
