package com.BNR.compliancePortal.domain;

import java.util.Set;

public enum ApplicationStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    PENDING_ADDITIONAL_INFO,
    REVIEWED,
    APPROVED,
    REJECTED;

    private static final Set<ApplicationStatus> TERMINAL = Set.of(APPROVED, REJECTED);

    public boolean isTerminal() {
        return TERMINAL.contains(this);
    }
}
