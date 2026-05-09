-- Configurable license categories for new applications. Applications still store the
-- chosen code in applications.license_type (validated against this catalog).

CREATE TABLE license_types (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    code        VARCHAR(64)  NOT NULL,
    label       VARCHAR(255) NOT NULL,
    enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT uk_license_types_code UNIQUE (code)
);

INSERT INTO license_types (code, label, enabled) VALUES
    ('COMMERCIAL_BANK', 'Commercial bank', TRUE),
    ('MICROFINANCE', 'Microfinance', TRUE);
