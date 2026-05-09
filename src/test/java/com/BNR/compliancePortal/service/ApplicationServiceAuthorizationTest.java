package com.BNR.compliancePortal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.exception.IllegalStateTransitionException;
import com.BNR.compliancePortal.exception.UnauthorizedActionException;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;


@SpringBootTest
@Transactional
class ApplicationServiceAuthorizationTest {

    @Autowired private ApplicationService applicationService;
    @Autowired private UserRepository userRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User applicant;
    private User reviewer;
    private User approver;
    private User otherApplicant;

    @BeforeEach
    void setUp() {
        applicantRepositoryCleanup();
        applicant      = newUser("alpha@bnr.rw",   Role.APPLICANT);
        otherApplicant = newUser("beta@bnr.rw",    Role.APPLICANT);
        reviewer       = newUser("rev@bnr.rw",     Role.REVIEWER);
        approver       = newUser("app@bnr.rw",     Role.APPROVER);
    }

    private void applicantRepositoryCleanup() {
        applicationRepository.deleteAll();
        userRepository.deleteAll();
    }

    private User newUser(String email, Role role) {
        return userRepository.save(User.builder()
            .email(email)
            .passwordHash(passwordEncoder.encode("Password123!"))
            .fullName(role.name() + " user")
            .role(role)
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("Applicant can create a draft -- a reviewer cannot")
    void onlyApplicantsCreateDrafts() {
        Application created = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "demo");
        assertThat(created.getStatus()).isEqualTo(ApplicationStatus.DRAFT);

        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.createDraft(reviewer, "Bad", "MICROFINANCE", "x"));
        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.createDraft(approver, "Bad", "MICROFINANCE", "x"));
    }

    @Test
    @DisplayName("Draft creation rejects unknown license type codes")
    void rejectsUnknownLicenseType() {
        assertThatExceptionOfType(BusinessRuleViolationException.class)
            .isThrownBy(() -> applicationService.createDraft(applicant, "X", "NOT_IN_CATALOG", ""));
    }

    @Test
    @DisplayName("Applicants can only see their own applications")
    void applicantsSeeOnlyTheirOwn() {
        Application mine    = applicationService.createDraft(applicant,      "Mine",  "MICROFINANCE", "");
        Application theirs  = applicationService.createDraft(otherApplicant, "Yours", "MICROFINANCE", "");

        assertThat(applicationService.listForUser(applicant)).extracting(Application::getId)
            .containsExactly(mine.getId());
        assertThat(applicationService.listForUser(otherApplicant)).extracting(Application::getId)
            .containsExactly(theirs.getId());

        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.getByIdForUser(theirs.getId(), applicant));
    }

    @Test
    @DisplayName("Applicant cannot start review or make decisions; reviewer cannot decide; approver cannot review")
    void rolesCannotCrossLanes() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());

        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.beginReview(applicant, app.getId()));
        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.beginReview(approver, app.getId()));

        applicationService.beginReview(reviewer, app.getId());
        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_APPROVAL, "looks ok");

        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.makeFinalDecision(
                reviewer, app.getId(), ApplicationStatus.APPROVED, "no"));

        assertThatExceptionOfType(UnauthorizedActionException.class)
            .isThrownBy(() -> applicationService.makeFinalDecision(
                applicant, app.getId(), ApplicationStatus.APPROVED, "no"));
    }

    @Test
    @DisplayName("Approver cannot approve an application that is not REVIEWED")
    void approverCannotShortCircuitTheStateMachine() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());

        assertThatExceptionOfType(IllegalStateTransitionException.class)
            .isThrownBy(() -> applicationService.makeFinalDecision(
                approver, app.getId(), ApplicationStatus.APPROVED, "premature"));
    }

    @Test
    @DisplayName("Terminal applications cannot be transitioned again")
    void terminalApplicationsAreFrozen() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_APPROVAL, "ok");
        applicationService.makeFinalDecision(approver, app.getId(),
            ApplicationStatus.APPROVED, "approved");

        assertThatExceptionOfType(IllegalStateTransitionException.class)
            .isThrownBy(() -> applicationService.makeFinalDecision(
                approver, app.getId(), ApplicationStatus.REJECTED, "no"));
        assertThatExceptionOfType(IllegalStateTransitionException.class)
            .isThrownBy(() -> applicationService.beginReview(reviewer, app.getId()));
    }

    @Test
    @DisplayName("PENDING_ADDITIONAL_INFO loop: applicant resubmits, reviewer reviews, approver decides")
    void resubmissionLoopWorks() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.requestAdditionalInfo(reviewer, app.getId(), "please attach licence");
        Application resubmitted = applicationService.resubmitAfterInfoRequest(applicant, app.getId(), "attached");
        assertThat(resubmitted.getStatus()).isEqualTo(ApplicationStatus.UNDER_REVIEW);

        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_REJECTION, "still incomplete");
        Application decided = applicationService.makeFinalDecision(approver, app.getId(),
            ApplicationStatus.REJECTED, "rejected");
        assertThat(decided.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
    }

    @Test
    @DisplayName("Reviewer dashboard keeps assigned cases after applicant resubmits from PENDING_ADDITIONAL_INFO")
    void reviewerDashboardIncludesResubmittedUnderReview() {
        Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.requestAdditionalInfo(reviewer, app.getId(), "need docs");

        assertThat(applicationService.listForUser(reviewer)).extracting(Application::getId)
            .contains(app.getId());

        applicationService.resubmitAfterInfoRequest(applicant, app.getId(), "here");

        assertThat(applicationService.listForUser(reviewer)).extracting(Application::getId)
            .contains(app.getId());
    }
}
