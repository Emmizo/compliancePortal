-- Bank Licensing & Compliance Portal -- initial schema.
-- All timestamps are stored as UTC TIMESTAMP(3) (millisecond precision) because the
-- audit log may be used as legal evidence and we need precise ordering.

CREATE TABLE users (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('APPLICANT','REVIEWER','APPROVER','ADMIN'))
);

CREATE TABLE applications (
    id                      BIGINT       NOT NULL AUTO_INCREMENT,
    institution_name        VARCHAR(255) NOT NULL,
    license_type            VARCHAR(64)  NOT NULL,
    description             TEXT         NULL,
    status                  VARCHAR(32)  NOT NULL,
    applicant_id            BIGINT       NOT NULL,
    assigned_reviewer_id    BIGINT       NULL,
    last_reviewer_id        BIGINT       NULL,
    final_decision_by_id    BIGINT       NULL,
    review_recommendation   VARCHAR(32)  NULL,
    decision_notes          TEXT         NULL,
    created_at              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    version                 BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_applications_applicant      FOREIGN KEY (applicant_id)         REFERENCES users(id),
    CONSTRAINT fk_applications_reviewer       FOREIGN KEY (assigned_reviewer_id) REFERENCES users(id),
    CONSTRAINT fk_applications_last_reviewer  FOREIGN KEY (last_reviewer_id)     REFERENCES users(id),
    CONSTRAINT fk_applications_decision_by    FOREIGN KEY (final_decision_by_id) REFERENCES users(id),
    CONSTRAINT ck_applications_status CHECK (status IN (
        'DRAFT','SUBMITTED','UNDER_REVIEW','PENDING_ADDITIONAL_INFO','REVIEWED','APPROVED','REJECTED'
    ))
);

CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_applications_status    ON applications(status);

CREATE TABLE documents (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    application_id      BIGINT       NOT NULL,
    uploader_id         BIGINT       NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    stored_filename     VARCHAR(255) NOT NULL,
    mime_type           VARCHAR(127) NOT NULL,
    size_bytes          BIGINT       NOT NULL,
    version_number      INT          NOT NULL,
    uploaded_at         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES applications(id),
    CONSTRAINT fk_documents_uploader    FOREIGN KEY (uploader_id)    REFERENCES users(id),
    CONSTRAINT uk_documents_stored UNIQUE (stored_filename),
    CONSTRAINT ck_documents_size_positive CHECK (size_bytes > 0)
);

CREATE INDEX idx_documents_application ON documents(application_id);

-- Append-only audit log. Application code must never UPDATE or DELETE this table.
-- The repository layer is intentionally limited to save()/find queries to enforce this.
CREATE TABLE audit_log (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    occurred_at     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    acting_user_id  BIGINT       NOT NULL,
    application_id  BIGINT       NULL,
    action          VARCHAR(64)  NOT NULL,
    state_before    VARCHAR(32)  NULL,
    state_after     VARCHAR(32)  NULL,
    notes           TEXT         NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_audit_user        FOREIGN KEY (acting_user_id) REFERENCES users(id),
    CONSTRAINT fk_audit_application FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE INDEX idx_audit_application ON audit_log(application_id);
CREATE INDEX idx_audit_actor       ON audit_log(acting_user_id);
CREATE INDEX idx_audit_occurred_at ON audit_log(occurred_at);
