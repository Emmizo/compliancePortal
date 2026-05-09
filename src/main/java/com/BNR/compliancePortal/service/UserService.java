package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.exception.ResourceNotFoundException;
import com.BNR.compliancePortal.repository.UserRepository;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<User> listAll() {
        return userRepository.findAll();
    }

    @Transactional
    public User createUser(User actingAdmin, String email, String fullName, String rawPassword, Role role) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleViolationException("An account with that email already exists");
        }
        User user = User.builder()
            .email(email.toLowerCase())
            .passwordHash(passwordEncoder.encode(rawPassword))
            .fullName(fullName)
            .role(role)
            .enabled(true)
            .build();
        User saved = userRepository.save(user);
        auditService.recordUserAction(actingAdmin, AuditService.ACTION_USER_REGISTERED,
            "Admin created user " + email + " with role " + role);
        return saved;
    }

    @Transactional
    public User changeRole(User actingAdmin, Long userId, Role newRole) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User " + userId + " not found"));
        Role previousRole = user.getRole();
        if (previousRole == newRole) {
            return user;
        }
        user.setRole(newRole);
        User saved = userRepository.save(user);
        auditService.recordUserAction(actingAdmin, AuditService.ACTION_USER_ROLE_CHANGED,
            "Changed role for userId=" + userId + " from " + previousRole + " to " + newRole);
        return saved;
    }

    @Transactional
    public User setEnabled(User actingAdmin, Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User " + userId + " not found"));
        if (user.isEnabled() == enabled) {
            return user;
        }
        user.setEnabled(enabled);
        User saved = userRepository.save(user);
        auditService.recordUserAction(actingAdmin,
            enabled ? "USER_ENABLED" : "USER_DISABLED",
            "Toggled enabled flag for userId=" + userId);
        return saved;
    }
}
