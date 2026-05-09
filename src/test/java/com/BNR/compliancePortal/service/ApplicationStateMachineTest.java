package com.BNR.compliancePortal.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.exception.IllegalStateTransitionException;
import com.BNR.compliancePortal.exception.UnauthorizedActionException;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ApplicationStateMachineTest {

    private final ApplicationStateMachine stateMachine = new ApplicationStateMachine();

    private static Map<Role, Set<Transition>> validTransitionsByRole() {
        return Map.of(
            Role.APPLICANT, Set.of(
                new Transition(ApplicationStatus.DRAFT,                   ApplicationStatus.SUBMITTED),
                new Transition(ApplicationStatus.PENDING_ADDITIONAL_INFO, ApplicationStatus.UNDER_REVIEW)),
            Role.REVIEWER, Set.of(
                new Transition(ApplicationStatus.SUBMITTED,    ApplicationStatus.UNDER_REVIEW),
                new Transition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.PENDING_ADDITIONAL_INFO),
                new Transition(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REVIEWED)),
            Role.APPROVER, Set.of(
                new Transition(ApplicationStatus.REVIEWED, ApplicationStatus.APPROVED),
                new Transition(ApplicationStatus.REVIEWED, ApplicationStatus.REJECTED)),
            Role.ADMIN, Set.of()
        );
    }

    static java.util.stream.Stream<Arguments> validTransitions() {
        return validTransitionsByRole().entrySet().stream()
            .flatMap(e -> e.getValue().stream()
                .map(t -> Arguments.of(t.from(), t.to(), e.getKey())));
    }

    @ParameterizedTest(name = "{2} can transition {0} -> {1}")
    @MethodSource("validTransitions")
    void everyValidTransitionSucceeds(ApplicationStatus from, ApplicationStatus to, Role role) {
        stateMachine.assertTransitionAllowed(from, to, role);
        assertThat(stateMachine.isTransitionAllowed(from, to, role)).isTrue();
    }

    static java.util.stream.Stream<Arguments> invalidNonTerminalTransitions() {
        Map<Role, Set<Transition>> valid = validTransitionsByRole();
        ApplicationStatus[] all = ApplicationStatus.values();
        java.util.List<Arguments> args = new java.util.ArrayList<>();
        for (Role role : Role.values()) {
            for (ApplicationStatus from : all) {
                if (from.isTerminal()) {
                    continue;
                }
                for (ApplicationStatus to : all) {
                    if (from == to) {
                        continue;
                    }
                    boolean isValidForAnyRole = validTransitionsByRole().values().stream()
                        .flatMap(Set::stream)
                        .anyMatch(t -> t.from() == from && t.to() == to);
                    boolean isValidForThisRole = valid.get(role).contains(new Transition(from, to));
                    if (isValidForThisRole) {
                        continue;
                    }
                    args.add(Arguments.of(from, to, role, isValidForAnyRole));
                }
            }
        }
        return args.stream();
    }

    @ParameterizedTest(name = "{2} attempting {0} -> {1} is rejected")
    @MethodSource("invalidNonTerminalTransitions")
    void invalidTransitionsAreRejected(ApplicationStatus from,
                                       ApplicationStatus to,
                                       Role role,
                                       boolean validForSomeOtherRole) {
        if (validForSomeOtherRole) {
            assertThatExceptionOfType(UnauthorizedActionException.class)
                .isThrownBy(() -> stateMachine.assertTransitionAllowed(from, to, role));
        } else {
            assertThatExceptionOfType(IllegalStateTransitionException.class)
                .isThrownBy(() -> stateMachine.assertTransitionAllowed(from, to, role));
        }
        assertThat(stateMachine.isTransitionAllowed(from, to, role)).isFalse();
    }

    @Test
    @DisplayName("APPROVED is terminal -- no transition is allowed for any role")
    void approvedIsTerminal() {
        for (Role role : Role.values()) {
            for (ApplicationStatus to : ApplicationStatus.values()) {
                if (to == ApplicationStatus.APPROVED) {
                    continue;
                }
                assertThatExceptionOfType(IllegalStateTransitionException.class)
                    .isThrownBy(() -> stateMachine.assertTransitionAllowed(
                        ApplicationStatus.APPROVED, to, role));
            }
        }
    }

    @Test
    @DisplayName("REJECTED is terminal -- no transition is allowed for any role")
    void rejectedIsTerminal() {
        for (Role role : Role.values()) {
            for (ApplicationStatus to : ApplicationStatus.values()) {
                if (to == ApplicationStatus.REJECTED) {
                    continue;
                }
                assertThatExceptionOfType(IllegalStateTransitionException.class)
                    .isThrownBy(() -> stateMachine.assertTransitionAllowed(
                        ApplicationStatus.REJECTED, to, role));
            }
        }
    }

    @Test
    void nullArgumentsAreRejected() {
        assertThatExceptionOfType(IllegalStateTransitionException.class)
            .isThrownBy(() -> stateMachine.assertTransitionAllowed(null, ApplicationStatus.SUBMITTED, Role.APPLICANT));
        assertThatExceptionOfType(IllegalStateTransitionException.class)
            .isThrownBy(() -> stateMachine.assertTransitionAllowed(ApplicationStatus.DRAFT, null, Role.APPLICANT));
    }

    private record Transition(ApplicationStatus from, ApplicationStatus to) {}
}
