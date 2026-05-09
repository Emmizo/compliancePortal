package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.AuditLog;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AuditLogAppenderImpl implements AuditLogAppender {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog append(AuditLog auditRow) {
        if (auditRow.getId() != null) {
            throw new IllegalArgumentException(
                "AuditLog rows are append-only; refusing a row that already has an id");
        }
        entityManager.persist(auditRow);
        return auditRow;
    }
}
