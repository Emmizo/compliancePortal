package com.BNR.compliancePortal.service;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.documents")
public record DocumentProperties(String storageRoot, long maxBytes) {

    public DocumentProperties {
        if (maxBytes <= 0) {
            throw new IllegalArgumentException("app.documents.max-bytes must be positive");
        }
        if (storageRoot == null || storageRoot.isBlank()) {
            throw new IllegalArgumentException("app.documents.storage-root must be configured");
        }
    }
}
