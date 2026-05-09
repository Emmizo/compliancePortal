package com.BNR.compliancePortal.realtime;

import com.BNR.compliancePortal.domain.ApplicationStatus;

public record ApplicationCommittedNotification(
    long applicationId,
    ApplicationStatus status,
    long applicantUserId,
    Long assignedReviewerUserId,
    boolean notifyReviewersTopic,
    boolean notifyApproversTopic,
    boolean notifyAdminsTopic
) {
}
