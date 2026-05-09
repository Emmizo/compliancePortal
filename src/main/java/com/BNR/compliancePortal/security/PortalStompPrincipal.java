package com.BNR.compliancePortal.security;

import com.BNR.compliancePortal.domain.Role;
import java.security.Principal;


public final class PortalStompPrincipal implements Principal {

    private final long userId;
    private final String email;
    private final Role portalRole;

    public PortalStompPrincipal(long userId, String email, Role portalRole) {
        this.userId = userId;
        this.email = email;
        this.portalRole = portalRole;
    }

    public long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public Role getPortalRole() {
        return portalRole;
    }

    @Override
    public String getName() {
        return String.valueOf(userId);
    }
}
