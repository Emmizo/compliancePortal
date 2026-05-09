package com.BNR.compliancePortal.domain;

public enum Role {
    APPLICANT,
    REVIEWER,
    APPROVER,
    ADMIN;

    public String authority() {
        return "ROLE_" + name();
    }
}
