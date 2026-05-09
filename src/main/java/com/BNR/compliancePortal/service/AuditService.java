package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.AuditLog;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.AuditLogRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.web.dto.AdminDtos.AuditLogResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    public static final String ACTION_USER_REGISTERED          = "USER_REGISTERED";
    public static final String ACTION_USER_LOGIN               = "USER_LOGIN";
    public static final String ACTION_APPLICATION_CREATED      = "APPLICATION_CREATED";
    public static final String ACTION_STATE_TRANSITION         = "APPLICATION_STATE_TRANSITION";
    public static final String ACTION_DOCUMENT_UPLOADED        = "DOCUMENT_UPLOADED";
    public static final String ACTION_REVIEW_NOTE_ADDED        = "REVIEW_NOTE_ADDED";
    public static final String ACTION_USER_ROLE_CHANGED        = "USER_ROLE_CHANGED";

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog recordStateTransition(User actor,
                                          Application application,
                                          ApplicationStatus before,
                                          ApplicationStatus after,
                                          String notes) {
        return append(AuditLog.builder()
            .occurredAt(Instant.now())
            .actingUserId(actor.getId())
            .applicationId(application.getId())
            .action(ACTION_STATE_TRANSITION)
            .stateBefore(Optional.ofNullable(before).map(ApplicationStatus::name).orElse(null))
            .stateAfter(Optional.ofNullable(after).map(ApplicationStatus::name).orElse(null))
            .notes(notes)
            .build());
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog record(User actor, Application application, String action, String notes) {
        String statusName = application == null ? null : application.getStatus().name();
        return append(AuditLog.builder()
            .occurredAt(Instant.now())
            .actingUserId(actor.getId())
            .applicationId(application == null ? null : application.getId())
            .action(action)
            .stateBefore(statusName)
            .stateAfter(statusName)
            .notes(notes)
            .build());
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog recordUserAction(User actor, String action, String notes) {
        return append(AuditLog.builder()
            .occurredAt(Instant.now())
            .actingUserId(actor.getId())
            .action(action)
            .notes(notes)
            .build());
    }

    public List<AuditLog> historyForApplication(Long applicationId) {
        return auditLogRepository.findAllByApplicationIdOrderByOccurredAtAscIdAsc(applicationId);
    }

    public List<AuditLog> historyForUser(Long userId) {
        return auditLogRepository.findAllByActingUserIdOrderByOccurredAtAscIdAsc(userId);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> historyForApplicationWithActorDetails(Long applicationId) {
        return toResponsesWithActors(historyForApplication(applicationId));
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> historyForApplicationForWorkflowViewer(Long applicationId, User viewer) {
        List<AuditLog> logs = historyForApplication(applicationId);
        return switch (viewer.getRole()) {
            case ADMIN -> toResponsesWithActors(logs);
            case REVIEWER, APPROVER -> toResponsesWithActors(
                logs.stream().filter(log -> viewer.getId().equals(log.getActingUserId())).toList());
            default -> throw new IllegalStateException(
                "Application audit is not exposed to role: " + viewer.getRole());
        };
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> historyForUserWithActorDetails(Long userId) {
        return toResponsesWithActors(historyForUser(userId));
    }

    private List<AuditLogResponse> toResponsesWithActors(List<AuditLog> logs) {
        if (logs.isEmpty()) {
            return List.of();
        }
        Set<Long> userIds = logs.stream().map(AuditLog::getActingUserId).collect(Collectors.toSet());
        Map<Long, User> byId = userRepository.findAllById(userIds).stream()
            .collect(Collectors.toMap(User::getId, Function.identity()));
        return logs.stream().map(row -> AuditLogResponse.from(row, byId.get(row.getActingUserId()))).toList();
    }

    private AuditLog append(AuditLog auditRow) {
        return auditLogRepository.append(auditRow);
    }
}
