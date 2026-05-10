package com.BNR.compliancePortal.config;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.service.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final String defaultPassword;

    public DataInitializer(UserRepository userRepository,
                           ApplicationRepository applicationRepository,
                           PasswordEncoder passwordEncoder,
                           AuditService auditService,
                           @Value("${app.seed.default-password}") String defaultPassword) {
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.defaultPassword = defaultPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        User admin     = ensureUser("admin@bnr.rw",     "BNR Administrator", Role.ADMIN);
        User reviewer  = ensureUser("reviewer@bnr.rw",  "BNR Reviewer",      Role.REVIEWER);
        User approver  = ensureUser("approver@bnr.rw",  "BNR Approver",      Role.APPROVER);
        User applicant = ensureUser("applicant@bnr.rw", "Sample Applicant",  Role.APPLICANT);

        ensureSubmittedApplication(applicant);
        ensureReviewedApplication(applicant, reviewer);

        log.debug("Seed users present: admin={}, reviewer={}, approver={}, applicant={}",
            admin.getEmail(), reviewer.getEmail(), approver.getEmail(), applicant.getEmail());
    }

    private User ensureUser(String email, String fullName, Role role) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(role)
                .enabled(true)
                .passwordHash(passwordEncoder.encode(defaultPassword))
                .build();
            User saved = userRepository.save(user);
            log.info("Seeded user {} with role {}", saved.getEmail(), saved.getRole());
            auditService.recordUserAction(saved, AuditService.ACTION_USER_REGISTERED,
                "Seed-data user provisioning");
            return saved;
        });
    }

    private void ensureSubmittedApplication(User applicant) {
        boolean alreadySeeded = applicationRepository.findAllByApplicantOrderByUpdatedAtDescIdDesc(applicant).stream()
            .anyMatch(a -> "Acme Microfinance Ltd".equals(a.getInstitutionName()));
        if (alreadySeeded) {
            return;
        }
        Application app = Application.builder()
            .institutionName("Acme Microfinance Ltd")
            .licenseType("MICROFINANCE")
            .description("Demo application currently awaiting reviewer pickup.")
            .status(ApplicationStatus.DRAFT)
            .applicant(applicant)
            .build();
        Application created = applicationRepository.save(app);
        auditService.record(applicant, created, AuditService.ACTION_APPLICATION_CREATED,
            "Seed: created draft");

        created.setStatus(ApplicationStatus.SUBMITTED);
        Application submitted = applicationRepository.save(created);
        auditService.recordStateTransition(applicant, submitted,
            ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED, "Seed: submitted draft");

        log.info("Seeded SUBMITTED application id={}", submitted.getId());
    }

    private void ensureReviewedApplication(User applicant, User reviewer) {
        boolean alreadyReviewed = applicationRepository.findAllByStatusOrderByUpdatedAtDescIdDesc(ApplicationStatus.REVIEWED)
            .stream()
            .anyMatch(a -> "Beta Commercial Bank Ltd".equals(a.getInstitutionName()));
        if (alreadyReviewed) {
            return;
        }
        Application app = Application.builder()
            .institutionName("Beta Commercial Bank Ltd")
            .licenseType("COMMERCIAL_BANK")
            .description("Demo application that has completed review and awaits approver decision.")
            .status(ApplicationStatus.DRAFT)
            .applicant(applicant)
            .build();
        Application created = applicationRepository.save(app);
        auditService.record(applicant, created, AuditService.ACTION_APPLICATION_CREATED,
            "Seed: created draft");

        created.setStatus(ApplicationStatus.SUBMITTED);
        Application submitted = applicationRepository.save(created);
        auditService.recordStateTransition(applicant, submitted,
            ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED, "Seed: submitted draft");

        submitted.setStatus(ApplicationStatus.UNDER_REVIEW);
        submitted.setAssignedReviewer(reviewer);
        Application underReview = applicationRepository.save(submitted);
        auditService.recordStateTransition(reviewer, underReview,
            ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, "Seed: review begun");

        underReview.setStatus(ApplicationStatus.REVIEWED);
        underReview.setReviewRecommendation(ReviewRecommendation.RECOMMEND_APPROVAL);
        underReview.setLastReviewer(reviewer);
        Application reviewed = applicationRepository.save(underReview);
        auditService.recordStateTransition(reviewer, reviewed,
            ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REVIEWED,
            "Seed: review completed with RECOMMEND_APPROVAL");

        log.info("Seeded REVIEWED application id={}", reviewed.getId());
    }
}
