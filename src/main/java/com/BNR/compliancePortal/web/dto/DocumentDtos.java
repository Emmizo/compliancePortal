package com.BNR.compliancePortal.web.dto;

import com.BNR.compliancePortal.domain.Document;
import java.time.Instant;

public final class DocumentDtos {

    private DocumentDtos() {}

    public record DocumentResponse(
        Long id,
        Long applicationId,
        Long uploaderId,
        String originalFilename,
        String mimeType,
        long sizeBytes,
        int versionNumber,
        Instant uploadedAt
    ) {
        public static DocumentResponse from(Document d) {
            return new DocumentResponse(
                d.getId(),
                d.getApplication().getId(),
                d.getUploader().getId(),
                d.getOriginalFilename(),
                d.getMimeType(),
                d.getSizeBytes(),
                d.getVersionNumber(),
                d.getUploadedAt());
        }
    }
}
