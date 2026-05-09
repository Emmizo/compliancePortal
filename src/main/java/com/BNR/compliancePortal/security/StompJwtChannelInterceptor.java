package com.BNR.compliancePortal.security;

import com.BNR.compliancePortal.domain.Role;
import io.jsonwebtoken.JwtException;
import java.security.Principal;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

@Component
public class StompJwtChannelInterceptor implements ChannelInterceptor {

    private static final String AUTH_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    /** Every portal role hits this private queue via {@code convertAndSendToUser}. */
    private static final String TOPIC_APPLICATION_EVENTS_REVIEWERS = "/topic/reviewers/application-events";
    private static final String TOPIC_APPLICATION_EVENTS_APPROVERS = "/topic/approvers/application-events";
    /** Admin-only relay; broadcaster already gates payload but subscription must match role. */
    private static final String TOPIC_APPLICATION_EVENTS_ADMINS = "/topic/admins/application-events";

    private final JwtService jwtService;
    private final ApplicationUserDetailsService userDetailsService;

    public StompJwtChannelInterceptor(JwtService jwtService,
                                      ApplicationUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
            return message;
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        List<String> headers = accessor.getNativeHeader(AUTH_HEADER);
        if (headers == null || headers.isEmpty()) {
            throw new IllegalArgumentException("Missing STOMP Authorization header");
        }
        String headerVal = headers.get(0).trim();
        if (!headerVal.startsWith(BEARER_PREFIX)) {
            throw new IllegalArgumentException("STOMP Authorization must be a Bearer token");
        }
        String token = headerVal.substring(BEARER_PREFIX.length()).trim();

        try {
            JwtService.ParsedToken parsed = jwtService.parseAndValidate(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(parsed.email());
            if (!userDetails.isEnabled()) {
                throw new IllegalArgumentException("User is disabled");
            }
            if (!(userDetails instanceof AuthenticatedUser au)) {
                throw new IllegalArgumentException("Unexpected principal type");
            }
            if (!au.getId().equals(parsed.userId())) {
                throw new IllegalArgumentException("Token subject does not match user id");
            }
            if (!parsed.role().equals(au.getRole().name())) {
                throw new IllegalArgumentException("Token role does not match stored user role");
            }
            accessor.setUser(new PortalStompPrincipal(au.getId(), au.getUsername(), au.getRole()));
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
            throw new IllegalArgumentException("Invalid STOMP credentials: " + e.getMessage());
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        Principal stompPrincipal = accessor.getUser();
        if (!(stompPrincipal instanceof PortalStompPrincipal p)) {
            throw new IllegalArgumentException("STOMP SUBSCRIBE without authenticated portal principal");
        }
        String brokerDestinationRaw = accessor.getDestination();
        if (brokerDestinationRaw == null || brokerDestinationRaw.isBlank()) {
            throw new IllegalArgumentException("SUBSCRIBE missing broker destination header");
        }
        String normalizedDestination = brokerDestinationRaw.trim();

        boolean isUserScopedQueueSubscription =
                normalizedDestination.startsWith("/user/")
                        || "/user".equals(normalizedDestination);
        if (isUserScopedQueueSubscription) {
            return;
        }

        if (normalizedDestination.startsWith("/topic/")
                || normalizedDestination.startsWith("/queue/")) {
            assertPortalRoleAllowsTopic(normalizedDestination, p.getPortalRole());
            return;
        }

        throw new IllegalArgumentException("Unknown subscription destination prefix: " + normalizedDestination);
    }

    private static void assertPortalRoleAllowsTopic(String destinationNormalized, Role role) {
        if (TOPIC_APPLICATION_EVENTS_ADMINS.equals(destinationNormalized)) {
            if (role != Role.ADMIN) {
                throw new IllegalArgumentException("Only ADMIN may subscribe to " + TOPIC_APPLICATION_EVENTS_ADMINS);
            }
            return;
        }
        if (TOPIC_APPLICATION_EVENTS_REVIEWERS.equals(destinationNormalized)) {
            if (role != Role.REVIEWER) {
                throw new IllegalArgumentException("Only REVIEWER may subscribe to " + TOPIC_APPLICATION_EVENTS_REVIEWERS);
            }
            return;
        }
        if (TOPIC_APPLICATION_EVENTS_APPROVERS.equals(destinationNormalized)) {
            if (role != Role.APPROVER) {
                throw new IllegalArgumentException("Only APPROVER may subscribe to " + TOPIC_APPLICATION_EVENTS_APPROVERS);
            }
            return;
        }
        throw new IllegalArgumentException("Disallowed broker destination for portal subscription: " + destinationNormalized);
    }
}
