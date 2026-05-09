package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.AuditLog;

public interface AuditLogAppender {

    AuditLog append(AuditLog auditRow);
}
