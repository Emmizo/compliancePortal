package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.exception.ResourceNotFoundException;
import com.BNR.compliancePortal.exception.UnauthorizedActionException;
import com.BNR.compliancePortal.realtime.ApplicationChangeEvents;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final ApplicationStateMachine stateMachine;
    private final AuditService auditService;
    private final LicenseTypeService licenseTypeService;
    private final ApplicationChangeEvents applicationChangeEvents;

    public ApplicationService(ApplicationRepository applicationRepository,
                              UserRepository userRepository,
                              ApplicationStateMachine stateMachine,
                              AuditService auditService,
                              LicenseTypeService licenseTypeService,
                              ApplicationChangeEvents applicationChangeEvents) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.stateMachine = stateMachine;
        this.auditService = auditService;
        this.licenseTypeService = licenseTypeService;
        this.applicationChangeEvents = applicationChangeEvents;
    }

    @Transactional
    public Application createDraft(User applicant, String institutionName, String licenseType, String description) {
        requireRole(applicant, Role.APPLICANT);
        Application app = Application.builder()
            .institutionName(institutionName)
            .licenseType(licenseTypeService.requireActiveCode(licenseType))
            .description(description)
            .status(ApplicationStatus.DRAFT)
            .applicant(applicant)
            .build();
        Application saved = applicationRepository.save(app);
        auditService.record(applicant, saved, AuditService.ACTION_APPLICATION_CREATED,
            "Draft application created");
        notifyRealtime(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Application getByIdForUser(Long id, User caller) {
        Application app = applicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Application " + id + " not found"));
        assertReadable(app, caller);
        warmAssociationsForApiProjection(app);
        return app;
    }

    @Transactional(readOnly = true)
    public List<Application> listForUser(User caller) {
        List<Application> apps = switch (caller.getRole()) {
            case APPLICANT -> applicationRepository.findAllByApplicant(caller);
            case REVIEWER -> reviewerDashboardApplications(caller);
            case APPROVER -> applicationRepository.findAllByStatus(ApplicationStatus.REVIEWED);
            case ADMIN -> applicationRepository.findAll();
        };
        apps.forEach(ApplicationService::warmAssociationsForApiProjection);
        return apps;
    }

    private List<Application> reviewerDashboardApplications(User reviewer) {
        Map<Long, Application> byId = new LinkedHashMap<>();
        applicationRepository.findAllByStatus(ApplicationStatus.SUBMITTED)
            .forEach(a -> byId.put(a.getId(), a));
        applicationRepository.findAllByAssignedReviewer(reviewer).stream()
            .filter(a -> {
                ApplicationStatus s = a.getStatus();
                return s == ApplicationStatus.UNDER_REVIEW || s == ApplicationStatus.PENDING_ADDITIONAL_INFO;
            })
            .forEach(a -> byId.putIfAbsent(a.getId(), a));
        return List.copyOf(byId.values());
    }

    @Transactional
    public Application submitDraft(User applicant, Long applicationId) {
        Application app = loadOrThrow(applicationId);
        if (!app.getApplicant().getId().equals(applicant.getId())) {
            throw new UnauthorizedActionException("Only the owning applicant may submit this draft");
        }
        Application saved = transition(app, ApplicationStatus.SUBMITTED, applicant, "Applicant submitted the draft");
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application beginReview(User reviewer, Long applicationId) {
        Application app = loadOrThrow(applicationId);
        Application updated = transition(app, ApplicationStatus.UNDER_REVIEW, reviewer,
            "Reviewer accepted the submission");
        updated.setAssignedReviewer(reviewer);
        Application saved = applicationRepository.save(updated);
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application requestAdditionalInfo(User reviewer, Long applicationId, String reviewerNotes) {
        Application app = loadOrThrow(applicationId);
        String notes = Optional.ofNullable(reviewerNotes).filter(n -> !n.isBlank()).orElseThrow(
            () -> new BusinessRuleViolationException(
                "Reviewer notes are required when requesting additional information"));
        Application saved = transition(app, ApplicationStatus.PENDING_ADDITIONAL_INFO, reviewer, notes);
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application resubmitAfterInfoRequest(User applicant, Long applicationId, String applicantNotes) {
        Application app = loadOrThrow(applicationId);
        if (!app.getApplicant().getId().equals(applicant.getId())) {
            throw new UnauthorizedActionException("Only the owning applicant may resubmit this application");
        }
        Application saved = transition(app, ApplicationStatus.UNDER_REVIEW, applicant,
            Optional.ofNullable(applicantNotes).orElse("Applicant resubmitted with additional information"));
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application submitReview(User reviewer,
                                    Long applicationId,
                                    ReviewRecommendation recommendation,
                                    String reviewerNotes) {
        if (recommendation == null) {
            throw new BusinessRuleViolationException("A review recommendation is required");
        }
        Application app = loadOrThrow(applicationId);
        Application updated = transition(app, ApplicationStatus.REVIEWED, reviewer,
            "Reviewer recommended " + recommendation
                + Optional.ofNullable(reviewerNotes).map(n -> ": " + n).orElse(""));
        updated.setReviewRecommendation(recommendation);
        updated.setLastReviewer(reviewer);
        Application saved = applicationRepository.save(updated);
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application makeFinalDecision(User approver,
                                         Long applicationId,
                                         ApplicationStatus decision,
                                         String decisionNotes) {
        if (decision != ApplicationStatus.APPROVED && decision != ApplicationStatus.REJECTED) {
            throw new BusinessRuleViolationException(
                "Final decision must be APPROVED or REJECTED, got " + decision);
        }
        Application app = loadOrThrow(applicationId);
        stateMachine.assertTransitionAllowed(app.getStatus(), decision, approver.getRole());
        if (Optional.ofNullable(app.getLastReviewer())
                .filter(lr -> lr.getId().equals(approver.getId()))
                .isPresent()) {
            throw new BusinessRuleViolationException(
                "The user who submitted the review cannot make the final decision on the same application");
        }
        Application updated = transition(app, decision, approver,
            "Approver decision: " + decision
                + Optional.ofNullable(decisionNotes).map(n -> ": " + n).orElse(""));
        updated.setFinalDecisionBy(approver);
        updated.setDecisionNotes(decisionNotes);
        Application saved = applicationRepository.save(updated);
        notifyRealtime(saved);
        return saved;
    }

    @Transactional
    public Application assignReviewer(User admin, Long applicationId, Long reviewerId) {
        requireRole(admin, Role.ADMIN);
        Application app = loadOrThrow(applicationId);
        User reviewer = userRepository.findById(reviewerId)
            .orElseThrow(() -> new ResourceNotFoundException("Reviewer " + reviewerId + " not found"));
        if (reviewer.getRole() != Role.REVIEWER) {
            throw new BusinessRuleViolationException("Assigned user must hold the REVIEWER role");
        }
        app.setAssignedReviewer(reviewer);
        Application saved = applicationRepository.save(app);
        auditService.record(admin, saved, "REVIEWER_ASSIGNED",
            "Admin assigned reviewer userId=" + reviewerId);
        notifyRealtime(saved);
        return saved;
    }

    private Application transition(Application app,
                                   ApplicationStatus target,
                                   User actor,
                                   String notes) {
        ApplicationStatus before = app.getStatus();
        stateMachine.assertTransitionAllowed(before, target, actor.getRole());
        app.setStatus(target);
        Application saved = applicationRepository.save(app);
        auditService.recordStateTransition(actor, saved, before, target, notes);
        return saved;
    }

    private Application loadOrThrow(Long id) {
        return applicationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Application " + id + " not found"));
    }

    private void requireRole(User user, Role required) {
        if (user.getRole() != required) {
            throw new UnauthorizedActionException(
                "Action requires role " + required + " but caller has " + user.getRole());
        }
    }

    private void assertReadable(Application app, User caller) {
        if (caller.getRole() != Role.APPLICANT) {
            return;
        }
        if (!app.getApplicant().getId().equals(caller.getId())) {
            throw new UnauthorizedActionException("Applicants may only view their own applications");
        }
    }

    private static void warmAssociationsForApiProjection(Application app) {
        app.getApplicant().getId();
        Optional.ofNullable(app.getAssignedReviewer()).ifPresent(User::getId);
        Optional.ofNullable(app.getLastReviewer()).ifPresent(User::getId);
        Optional.ofNullable(app.getFinalDecisionBy()).ifPresent(User::getId);
    }

    private void notifyRealtime(Application app) {
        warmAssociationsForApiProjection(app);
        app.getApplicant().getEmail();
        Optional.ofNullable(app.getAssignedReviewer()).ifPresent(User::getEmail);
        applicationChangeEvents.publish(app);
    }
}
