package com.BNR.compliancePortal.security;

import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.repository.UserRepository;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;


@Component
public class CurrentUserResolver {

    private final UserRepository userRepository;

    public CurrentUserResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof AuthenticatedUser principal)) {
            throw new InsufficientAuthenticationException("No authenticated user in the security context");
        }
        return userRepository.findById(principal.getId())
            .orElseThrow(() -> new InsufficientAuthenticationException(
                "Authenticated user no longer exists: id=" + principal.getId()));
    }
}
