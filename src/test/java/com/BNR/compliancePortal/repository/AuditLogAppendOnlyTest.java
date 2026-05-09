package com.BNR.compliancePortal.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.BNR.compliancePortal.domain.AuditLog;
import java.lang.reflect.Method;
import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;


@SpringBootTest
class AuditLogAppendOnlyTest {

    @Autowired AuditLogRepository auditLogRepository;

    @Test
    @DisplayName("AuditLogRepository must not expose any update or delete methods")
    void repositoryExposesNoMutatingMethods() {
        for (Method method : AuditLogRepository.class.getMethods()) {
            String name = method.getName().toLowerCase();
            assertThat(name)
                .as("Repository method '%s' violates the append-only contract", method.getName())
                .doesNotContain("delete")
                .doesNotContain("remove")
                .doesNotStartWith("update");
        }
    }

    @Test
    @Transactional
    @DisplayName("Appending an entry with a non-null id is rejected")
    void cannotAppendEntryWithExistingId() {
        AuditLog poisoned = AuditLog.builder()
            .id(999L)
            .occurredAt(Instant.now())
            .actingUserId(1L)
            .action("ATTEMPTED_OVERWRITE")
            .build();

        Throwable thrown = catchThrowable(() -> auditLogRepository.append(poisoned));
        assertThat(thrown).isNotNull();

        Throwable root = thrown;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        assertThat(root).isInstanceOfAny(IllegalArgumentException.class,
            org.springframework.dao.InvalidDataAccessApiUsageException.class);
    }
}
