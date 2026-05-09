package com.BNR.compliancePortal.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.UserRepository;
import com.BNR.compliancePortal.web.error.ApiError;
import com.BNR.compliancePortal.web.error.GlobalExceptionHandler;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;


@SpringBootTest
class OptimisticLockingConcurrencyTest {

    @Autowired private ApplicationService applicationService;
    @Autowired private ApplicationRepository applicationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private TransactionTemplate transactionTemplate;
    @Autowired private GlobalExceptionHandler globalExceptionHandler;

    private Long submittedAppId;
    private Long reviewerAId;
    private Long reviewerBId;

    @BeforeEach
    void setUp() {
        cleanDatabase();
        transactionTemplate.executeWithoutResult(status -> {
            User applicant = saveUser("applicant@bnr.rw", Role.APPLICANT);
            User reviewerA = saveUser("reviewer-a@bnr.rw", Role.REVIEWER);
            User reviewerB = saveUser("reviewer-b@bnr.rw", Role.REVIEWER);
            reviewerAId = reviewerA.getId();
            reviewerBId = reviewerB.getId();

            Application app = applicationService.createDraft(applicant, "Acme", "MICROFINANCE", "");
            applicationService.submitDraft(applicant, app.getId());
            submittedAppId = app.getId();
        });
    }

    @AfterEach
    void tearDown() {
        cleanDatabase();
    }

    private void cleanDatabase() {
        transactionTemplate.executeWithoutResult(status -> {
            applicationRepository.deleteAll();
            userRepository.deleteAll();
        });
    }

    private User saveUser(String email, Role role) {
        return userRepository.save(User.builder()
            .email(email)
            .passwordHash(passwordEncoder.encode("Password123!"))
            .fullName(role.name())
            .role(role)
            .enabled(true)
            .build());
    }

    @Test
    @DisplayName("Two reviewers racing to begin-review: exactly one succeeds, the other gets a conflict")
    void simultaneousUpdatesYieldExactlyOneWinner() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch ready = new CountDownLatch(2);
            CountDownLatch go    = new CountDownLatch(1);

            AtomicInteger successes = new AtomicInteger();
            AtomicInteger conflicts = new AtomicInteger();
            AtomicReference<Throwable> unexpected = new AtomicReference<>();

            for (Long reviewerId : new Long[] {reviewerAId, reviewerBId}) {
                pool.submit(() -> {
                    User reviewer = userRepository.findById(reviewerId).orElseThrow();
                    ready.countDown();
                    try {
                        go.await();
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                    try {
                        applicationService.beginReview(reviewer, submittedAppId);
                        successes.incrementAndGet();
                    } catch (Throwable t) {
                        if (rootCauseIsOptimisticLock(t)) {
                            conflicts.incrementAndGet();
                        } else {
                            unexpected.set(t);
                        }
                    }
                });
            }

            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            pool.shutdown();
            assertThat(pool.awaitTermination(20, TimeUnit.SECONDS)).isTrue();

            if (unexpected.get() != null) {
                throw new AssertionError("Unexpected error from concurrent update", unexpected.get());
            }
            assertThat(successes.get()).isEqualTo(1);
            assertThat(conflicts.get()).isEqualTo(1);

            Application reload = applicationRepository.findById(submittedAppId).orElseThrow();
            assertThat(reload.getStatus()).isEqualTo(ApplicationStatus.UNDER_REVIEW);
            assertThat(reload.getAssignedReviewer()).isNotNull();
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    @DisplayName("OptimisticLockingFailureException is mapped to HTTP 409 with a clean message")
    void optimisticLockMapsTo409() {
        ResponseEntity<ApiError> response = globalExceptionHandler.optimisticLock(
            new OptimisticLockingFailureException("synthetic conflict"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        ApiError body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo(409);
        assertThat(body.error()).isEqualTo("Conflict");
        assertThat(body.message()).doesNotContain("synthetic conflict");
        assertThat(body.message()).contains("updated by another user");
    }

    private static boolean rootCauseIsOptimisticLock(Throwable t) {
        Throwable cur = t;
        while (cur != null) {
            if (cur instanceof OptimisticLockingFailureException) {
                return true;
            }
            if (cur.getCause() == cur) {
                return false;
            }
            cur = cur.getCause();
        }
        return false;
    }
}
