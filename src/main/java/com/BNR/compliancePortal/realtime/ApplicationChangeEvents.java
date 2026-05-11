package com.BNR.compliancePortal.realtime;

import com.BNR.compliancePortal.domain.Application;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class ApplicationChangeEvents {

    private final ApplicationEventPublisher publisher;

    public ApplicationChangeEvents(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    /**
     * Publishes after every material application change (create, submit, review, decision, …).
     * Staff topics are all enabled for every status so every connected role invalidates caches:
     * approvers only subscribe to /topic/approvers/… (they do not receive /user/queue like applicants).
     */
    public void publish(Application app) {
        Long reviewerId = app.getAssignedReviewer() == null ? null : app.getAssignedReviewer().getId();
        publisher.publishEvent(new ApplicationCommittedNotification(
            app.getId(),
            app.getStatus(),
            app.getApplicant().getId(),
            reviewerId,
            true,
            true,
            true));
    }
}
