package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.security.CurrentUserResolver;
import com.BNR.compliancePortal.service.AuditService;
import com.BNR.compliancePortal.service.ApplicationService;
import com.BNR.compliancePortal.service.UserService;
import com.BNR.compliancePortal.web.dto.AdminDtos.AuditLogResponse;
import com.BNR.compliancePortal.web.dto.AdminDtos.ChangeRoleRequest;
import com.BNR.compliancePortal.web.dto.AdminDtos.CreateUserRequest;
import com.BNR.compliancePortal.web.dto.AdminDtos.UserResponse;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.ApplicationResponse;
import com.BNR.compliancePortal.web.dto.ApplicationDtos.AssignReviewerRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    private final UserService userService;
    private final ApplicationService applicationService;
    private final AuditService auditService;
    private final CurrentUserResolver currentUserResolver;

    public AdminController(UserService userService,
                           ApplicationService applicationService,
                           AuditService auditService,
                           CurrentUserResolver currentUserResolver) {
        this.userService = userService;
        this.applicationService = applicationService;
        this.auditService = auditService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserResponse>> listUsers() {
        return ResponseEntity.ok(userService.listAll().stream().map(UserResponse::from).toList());
    }

    @PostMapping("/users")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest payload) {
        User admin = currentUserResolver.requireCurrentUser();
        User created = userService.createUser(admin, payload.email(), payload.fullName(),
            payload.password(), payload.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(created));
    }

    @PatchMapping("/users/{userId}/role")
    public ResponseEntity<UserResponse> changeRole(@PathVariable Long userId,
                                                   @Valid @RequestBody ChangeRoleRequest payload) {
        User admin = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(UserResponse.from(
            userService.changeRole(admin, userId, payload.role())));
    }

    @PostMapping("/applications/{applicationId}/assign-reviewer")
    public ResponseEntity<ApplicationResponse> assignReviewer(@PathVariable Long applicationId,
                                                              @Valid @RequestBody AssignReviewerRequest payload) {
        User admin = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(ApplicationResponse.from(
            applicationService.assignReviewer(admin, applicationId, payload.reviewerId())));
    }

    @GetMapping("/audit-log/by-application/{applicationId}")
    public ResponseEntity<List<AuditLogResponse>> auditByApplication(@PathVariable Long applicationId) {
        return ResponseEntity.ok(auditService.historyForApplicationWithActorDetails(applicationId));
    }

    @GetMapping("/audit-log/by-user/{userId}")
    public ResponseEntity<List<AuditLogResponse>> auditByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(auditService.historyForUserWithActorDetails(userId));
    }
}
