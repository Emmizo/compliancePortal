package com.BNR.compliancePortal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.web.dto.AdminDtos.AuditLogResponse;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AuditServiceWorkflowViewTest {

    @Autowired private AuditService auditService;
    @Autowired private ApplicationService applicationService;
    @Autowired private UserRepository userRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User applicant;
    private User reviewer;
    private User admin;

    @BeforeEach
    void setUp() {
        applicationRepository.deleteAll();
        userRepository.deleteAll();

        applicant = saveUser("applicant@bnr.rw", Role.APPLICANT);
        reviewer = saveUser("reviewer@bnr.rw", Role.REVIEWER);
        admin = saveUser("admin@bnr.rw", Role.ADMIN);
    }

    private User saveUser(String email, Role role) {
        return userRepository.save(User.builder()
            .email(email)
            .passwordHash(passwordEncoder.encode("Password123!"))
            .fullName(role.name() + " user")
            .role(role)
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("Reviewer sees only their own audit rows for an application")
    void reviewerSeesOnlyOwnApplicationAuditRows() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());

        List<AuditLogResponse> full = auditService.historyForApplicationWithActorDetails(app.getId());
        List<AuditLogResponse> forReviewer =
            auditService.historyForApplicationForWorkflowViewer(app.getId(), reviewer);

        assertThat(full).hasSizeGreaterThan(forReviewer.size());
        assertThat(forReviewer).noneMatch(e -> applicant.getFullName().equals(e.actingUserFullName()));
        assertThat(forReviewer)
            .allMatch(e -> reviewer.getEmail().equals(e.actingUserEmail()));
    }

    @Test
    @DisplayName("Admin sees full application audit like unscoped reader")
    void adminSeesFullApplicationAudit() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_APPROVAL, "ok");

        List<AuditLogResponse> full = auditService.historyForApplicationWithActorDetails(app.getId());
        List<AuditLogResponse> forAdmin =
            auditService.historyForApplicationForWorkflowViewer(app.getId(), admin);

        assertThat(forAdmin).hasSize(full.size());
    }

    @Test
    @DisplayName("Applicant is not a supported workflow viewer for application-scoped audit")
    void applicantWorkflowViewerThrows() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");

        assertThatExceptionOfType(IllegalStateException.class)
            .isThrownBy(() -> auditService.historyForApplicationForWorkflowViewer(app.getId(), applicant));
    }
}
