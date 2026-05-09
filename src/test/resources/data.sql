-- Test catalog mirroring production seed (Flyway V2). Hibernate builds the schema; this
-- runs after schema creation when spring.jpa.defer-datasource-initialization=true.

INSERT INTO license_types (code, label, enabled, created_at) VALUES
('COMMERCIAL_BANK', 'Commercial bank', TRUE, CURRENT_TIMESTAMP),
('MICROFINANCE', 'Microfinance', TRUE, CURRENT_TIMESTAMP);
