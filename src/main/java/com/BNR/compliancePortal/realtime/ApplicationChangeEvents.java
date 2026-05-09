package com.BNR.compliancePortal.realtime;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class ApplicationChangeEvents {

    private final ApplicationEventPublisher publisher;

    public ApplicationChangeEvents(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void publish(Application app) {
        ApplicationStatus status = app.getStatus();
        Long reviewerId = app.getAssignedReviewer() == null ? null : app.getAssignedReviewer().getId();
        boolean approversTopic = status == ApplicationStatus.REVIEWED
            || status == ApplicationStatus.APPROVED
            || status == ApplicationStatus.REJECTED;
        publisher.publishEvent(new ApplicationCommittedNotification(
            app.getId(),
            status,
            app.getApplicant().getId(),
            reviewerId,
            true,
            approversTopic,
            true));
    }
}
