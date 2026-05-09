package com.BNR.compliancePortal.repository;

import com.BNR.compliancePortal.domain.AuditLog;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

public interface AuditLogRepository extends Repository<AuditLog, Long>, AuditLogAppender {

    AuditLog findFirstById(Long id);

    List<AuditLog> findAllByApplicationIdOrderByOccurredAtAscIdAsc(Long applicationId);

    List<AuditLog> findAllByActingUserIdOrderByOccurredAtAscIdAsc(Long actingUserId);

    Page<AuditLog> findAllByOrderByOccurredAtDescIdDesc(Pageable pageable);

    long count();
}
