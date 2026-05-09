package com.BNR.compliancePortal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class ReviewerApproverSeparationTest {

    @Autowired private ApplicationService applicationService;
    @Autowired private UserRepository userRepository;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private User applicant;
    private User reviewer;
    private User secondApprover;

    @BeforeEach
    void setUp() {
        applicationRepository.deleteAll();
        userRepository.deleteAll();
        applicant      = newUser("applicant@bnr.rw",     Role.APPLICANT);
        reviewer       = newUser("dual.role@bnr.rw",     Role.REVIEWER);
        secondApprover = newUser("clean.approver@bnr.rw", Role.APPROVER);
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
    @DisplayName("A user who reviewed cannot approve, even if their role becomes APPROVER")
    void reviewerCannotLaterApproveSameApplication() {
        Application app = applicationService.createDraft(applicant, "Acme Bank", "COMMERCIAL_BANK", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_APPROVAL, "looks ok");

        reviewer.setRole(Role.APPROVER);
        userRepository.save(reviewer);

        assertThatExceptionOfType(BusinessRuleViolationException.class)
            .isThrownBy(() -> applicationService.makeFinalDecision(
                reviewer, app.getId(), ApplicationStatus.APPROVED, "self-approve attempt"))
            .withMessageContaining("cannot make the final decision");

        Application reload = applicationRepository.findById(app.getId()).orElseThrow();
        assertThat(reload.getStatus()).isEqualTo(ApplicationStatus.REVIEWED);
        assertThat(reload.getFinalDecisionBy()).isNull();
    }

    @Test
    @DisplayName("A different user holding the APPROVER role can approve the reviewed application")
    void differentApproverIsAllowed() {
        Application app = applicationService.createDraft(applicant, "Acme Bank", "COMMERCIAL_BANK", "");
        applicationService.submitDraft(applicant, app.getId());
        applicationService.beginReview(reviewer, app.getId());
        applicationService.submitReview(reviewer, app.getId(),
            ReviewRecommendation.RECOMMEND_APPROVAL, "looks ok");

        Application decided = applicationService.makeFinalDecision(
            secondApprover, app.getId(), ApplicationStatus.APPROVED, "all in order");

        assertThat(decided.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(decided.getFinalDecisionBy().getId()).isEqualTo(secondApprover.getId());
        assertThat(decided.getLastReviewer().getId()).isEqualTo(reviewer.getId());
    }
}
