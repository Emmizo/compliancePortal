package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.exception.IllegalStateTransitionException;
import com.BNR.compliancePortal.exception.UnauthorizedActionException;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ApplicationStateMachine {

    private static final Map<TransitionKey, Set<Role>> TRANSITIONS = Map.of(
        new TransitionKey(ApplicationStatus.DRAFT,                   ApplicationStatus.SUBMITTED),                Set.of(Role.APPLICANT),
        new TransitionKey(ApplicationStatus.PENDING_ADDITIONAL_INFO, ApplicationStatus.UNDER_REVIEW),             Set.of(Role.APPLICANT),
        new TransitionKey(ApplicationStatus.SUBMITTED,               ApplicationStatus.UNDER_REVIEW),             Set.of(Role.REVIEWER),
        new TransitionKey(ApplicationStatus.UNDER_REVIEW,            ApplicationStatus.PENDING_ADDITIONAL_INFO),  Set.of(Role.REVIEWER),
        new TransitionKey(ApplicationStatus.UNDER_REVIEW,            ApplicationStatus.REVIEWED),                 Set.of(Role.REVIEWER),
        new TransitionKey(ApplicationStatus.REVIEWED,                ApplicationStatus.APPROVED),                 Set.of(Role.APPROVER),
        new TransitionKey(ApplicationStatus.REVIEWED,                ApplicationStatus.REJECTED),                 Set.of(Role.APPROVER)
    );

    public void assertTransitionAllowed(ApplicationStatus from, ApplicationStatus to, Role actorRole) {
        if (from == null || to == null) {
            throw new IllegalStateTransitionException("State transition arguments must not be null");
        }
        if (from.isTerminal()) {
            throw new IllegalStateTransitionException(
                "Application is in terminal state " + from + " and cannot be transitioned");
        }
        Set<Role> allowedRoles = TRANSITIONS.get(new TransitionKey(from, to));
        if (allowedRoles == null) {
            throw IllegalStateTransitionException.notAllowed(from, to);
        }
        if (!allowedRoles.contains(actorRole)) {
            throw new UnauthorizedActionException(
                "Role " + actorRole + " is not permitted to perform transition " + from + " -> " + to);
        }
    }

    public boolean isTransitionAllowed(ApplicationStatus from, ApplicationStatus to, Role actorRole) {
        return Optional.ofNullable(from)
            .filter(f -> !f.isTerminal())
            .flatMap(f -> Optional.ofNullable(TRANSITIONS.get(new TransitionKey(f, to))))
            .map(roles -> roles.contains(actorRole))
            .orElse(false);
    }

    private record TransitionKey(ApplicationStatus from, ApplicationStatus to) {}
}
