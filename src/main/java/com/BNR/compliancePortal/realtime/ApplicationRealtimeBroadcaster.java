package com.BNR.compliancePortal.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ApplicationRealtimeBroadcaster {

    private final SimpMessagingTemplate messaging;

    public ApplicationRealtimeBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCommitted(ApplicationCommittedNotification evt) {
        ApplicationRealtimeMessage msg = new ApplicationRealtimeMessage(
            evt.applicationId(), evt.status().name());

        messaging.convertAndSendToUser(
            String.valueOf(evt.applicantUserId()), "/queue/application-events", msg);

        if (evt.assignedReviewerUserId() != null
            && !evt.assignedReviewerUserId().equals(evt.applicantUserId())) {
            messaging.convertAndSendToUser(
                String.valueOf(evt.assignedReviewerUserId()), "/queue/application-events", msg);
        }

        if (evt.notifyReviewersTopic()) {
            messaging.convertAndSend("/topic/reviewers/application-events", msg);
        }
        if (evt.notifyApproversTopic()) {
            messaging.convertAndSend("/topic/approvers/application-events", msg);
        }
        if (evt.notifyAdminsTopic()) {
            messaging.convertAndSend("/topic/admins/application-events", msg);
        }
    }
}
