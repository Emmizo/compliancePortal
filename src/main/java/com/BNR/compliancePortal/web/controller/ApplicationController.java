package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.security.CurrentUserResolver;
import com.BNR.compliancePortal.service.ApplicationService;
import com.BNR.compliancePortal.service.AuditService;
import com.BNR.compliancePortal.web.dto.AdminDtos.AuditLogResponse;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.ApplicationResponse;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.CreateApplicationRequest;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.FinalDecisionRequest;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.ReviewerFollowUpRequest;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.ResubmitRequest;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.SubmitReviewRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final AuditService auditService;
    private final CurrentUserResolver currentUserResolver;

    public ApplicationController(ApplicationService applicationService,
                                 AuditService auditService,
                                 CurrentUserResolver currentUserResolver) {
        this.applicationService = applicationService;
        this.auditService = auditService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_APPLICANT')")
    public ResponseEntity<ApplicationResponse> create(@Valid @RequestBody CreateApplicationRequest payload) {
        User caller = currentUserResolver.requireCurrentUser();
        Application app = applicationService.createDraft(caller, payload.institutionName(),
            payload.licenseType(), payload.description());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApplicationResponse.from(app));
    }

    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> list() {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(applicationService.listForUser(caller).stream()
            .map(ApplicationResponse::from)
            .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> get(@PathVariable Long id) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.getByIdForUser(id, caller)));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAuthority('ROLE_APPLICANT')")
    public ResponseEntity<ApplicationResponse> submit(@PathVariable Long id) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.submitDraft(caller, id)));
    }

    @PostMapping("/{id}/begin-review")
    @PreAuthorize("hasAuthority('ROLE_REVIEWER')")
    public ResponseEntity<ApplicationResponse> beginReview(@PathVariable Long id) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.beginReview(caller, id)));
    }

    @PostMapping("/{id}/request-info")
    @PreAuthorize("hasAuthority('ROLE_REVIEWER')")
    public ResponseEntity<ApplicationResponse> requestReviewerFollowUp(@PathVariable Long id,
                                                                       @Valid @RequestBody ReviewerFollowUpRequest payload) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.requestAdditionalInfo(caller, id, payload.reviewerNotes())));
    }

    @PostMapping("/{id}/resubmit")
    @PreAuthorize("hasAuthority('ROLE_APPLICANT')")
    public ResponseEntity<ApplicationResponse> resubmit(@PathVariable Long id,
                                                        @Valid @RequestBody ResubmitRequest payload) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.resubmitAfterInfoRequest(caller, id, payload.applicantNotes())));
    }

    @PostMapping("/{id}/submit-review")
    @PreAuthorize("hasAuthority('ROLE_REVIEWER')")
    public ResponseEntity<ApplicationResponse> submitReview(@PathVariable Long id,
                                                            @Valid @RequestBody SubmitReviewRequest payload) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.submitReview(caller, id, payload.recommendation(), payload.reviewerNotes())));
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasAuthority('ROLE_APPROVER')")
    public ResponseEntity<ApplicationResponse> decide(@PathVariable Long id,
                                                      @Valid @RequestBody FinalDecisionRequest payload) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.makeFinalDecision(caller, id, payload.decision(), payload.decisionNotes())));
    }

    @GetMapping("/{id}/audit")
    @PreAuthorize("hasAnyAuthority('ROLE_REVIEWER','ROLE_APPROVER','ROLE_ADMIN')")
    public ResponseEntity<List<AuditLogResponse>> auditTrail(@PathVariable Long id) {
        User caller = currentUserResolver.requireCurrentUser();
        applicationService.getByIdForUser(id, caller);
        return ResponseEntity.ok(auditService.historyForApplicationForWorkflowViewer(id, caller));
    }
}
