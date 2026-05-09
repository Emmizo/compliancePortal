package com.BNR.compliancePortal.web.dto;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.ReviewRecommendation;
import com.BNR.compliancePortal.domain.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Optional;

public final class ApplicationDtos {

    private ApplicationDtos() {}

    public record CreateApplicationRequest(
        @NotBlank @Size(max = 255) String institutionName,
        @NotBlank @Size(max = 64)  String licenseType,
        @Size(max = 4000)          String description
    ) {}

    public record ReviewerFollowUpRequest(
        @NotBlank @Size(max = 4000) String reviewerNotes
    ) {}

    public record ResubmitRequest(
        @Size(max = 4000) String applicantNotes
    ) {}

    public record SubmitReviewRequest(
        @NotNull ReviewRecommendation recommendation,
        @Size(max = 4000) String reviewerNotes
    ) {}

    public record FinalDecisionRequest(
        @NotNull ApplicationStatus decision,
        @Size(max = 4000) String decisionNotes
    ) {}

    public record AssignReviewerRequest(
        @NotNull Long reviewerId
    ) {}

    public record ApplicationResponse(
        Long id,
        String institutionName,
        String licenseType,
        String description,
        ApplicationStatus status,
        Long applicantId,
        Long assignedReviewerId,
        Long lastReviewerId,
        Long finalDecisionById,
        ReviewRecommendation reviewRecommendation,
        String decisionNotes,
        Instant createdAt,
        Instant updatedAt,
        Long version
    ) {
        public static ApplicationResponse from(Application submission) {
            return new ApplicationResponse(
                submission.getId(),
                submission.getInstitutionName(),
                submission.getLicenseType(),
                submission.getDescription(),
                submission.getStatus(),
                Optional.ofNullable(submission.getApplicant()).map(User::getId).orElse(null),
                Optional.ofNullable(submission.getAssignedReviewer()).map(User::getId).orElse(null),
                Optional.ofNullable(submission.getLastReviewer()).map(User::getId).orElse(null),
                Optional.ofNullable(submission.getFinalDecisionBy()).map(User::getId).orElse(null),
                submission.getReviewRecommendation(),
                submission.getDecisionNotes(),
                submission.getCreatedAt(),
                submission.getUpdatedAt(),
                submission.getVersion()
            );
        }
    }
}
