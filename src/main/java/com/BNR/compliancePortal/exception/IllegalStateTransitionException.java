package com.BNR.compliancePortal.exception;

import com.BNR.compliancePortal.domain.ApplicationStatus;


public class IllegalStateTransitionException extends RuntimeException {

    public IllegalStateTransitionException(String message) {
        super(message);
    }

    public static IllegalStateTransitionException notAllowed(ApplicationStatus from, ApplicationStatus to) {
        return new IllegalStateTransitionException(
            "Illegal application state transition: " + from + " -> " + to);
    }
}
