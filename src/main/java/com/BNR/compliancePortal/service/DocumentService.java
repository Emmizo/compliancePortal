package com.BNR.compliancePortal.service;

import com.BNR.compliancePortal.domain.Application;
import com.BNR.compliancePortal.domain.ApplicationStatus;
import com.BNR.compliancePortal.domain.Document;
import com.BNR.compliancePortal.domain.Role;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.exception.BusinessRuleViolationException;
import com.BNR.compliancePortal.exception.ResourceNotFoundException;
import com.BNR.compliancePortal.exception.UnauthorizedActionException;
import com.BNR.compliancePortal.realtime.ApplicationChangeEvents;
import com.BNR.compliancePortal.repository.ApplicationRepository;
import com.BNR.compliancePortal.repository.DocumentRepository;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
        "text/plain"
    );

    private final DocumentRepository documentRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationService applicationService;
    private final DocumentStorage storage;
    private final DocumentProperties properties;
    private final AuditService auditService;
    private final ApplicationChangeEvents applicationChangeEvents;

    public DocumentService(DocumentRepository documentRepository,
                           ApplicationRepository applicationRepository,
                           ApplicationService applicationService,
                           DocumentStorage storage,
                           DocumentProperties properties,
                           AuditService auditService,
                           ApplicationChangeEvents applicationChangeEvents) {
        this.documentRepository = documentRepository;
        this.applicationRepository = applicationRepository;
        this.applicationService = applicationService;
        this.storage = storage;
        this.properties = properties;
        this.auditService = auditService;
        this.applicationChangeEvents = applicationChangeEvents;
    }

    @Transactional
    public Document upload(User uploader,
                           Long applicationId,
                           InputStream content,
                           long declaredSizeBytes,
                           String originalFilename,
                           String mimeType) {
        Application app = applicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application " + applicationId + " not found"));
        if (!app.getApplicant().getId().equals(uploader.getId())) {
            throw new UnauthorizedActionException("Only the owning applicant may upload documents");
        }
        ApplicationStatus st = app.getStatus();
        if (st != ApplicationStatus.DRAFT && st != ApplicationStatus.PENDING_ADDITIONAL_INFO) {
            throw new BusinessRuleViolationException(
                "Documents can only be uploaded while the application is in DRAFT or PENDING_ADDITIONAL_INFO state");
        }
        if (Optional.ofNullable(originalFilename).filter(f -> !f.isBlank()).isEmpty()) {
            throw new BusinessRuleViolationException("A filename is required");
        }
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType.toLowerCase())) {
            throw new BusinessRuleViolationException(
                "Unsupported MIME type: " + mimeType + ". Allowed: " + ALLOWED_MIME_TYPES);
        }
        long maxBytes = properties.maxBytes();
        if (declaredSizeBytes <= 0 || declaredSizeBytes > maxBytes) {
            throw new BusinessRuleViolationException(
                "File size " + declaredSizeBytes + " bytes exceeds the configured limit of "
                    + maxBytes + " bytes");
        }

        DocumentStorage.StoredBlob blob = storage.store(safeStream(content), originalFilename);
        long blobSz = blob.sizeBytes();
        if (blobSz > maxBytes) {
            throw new BusinessRuleViolationException(
                "Streamed file size " + blobSz + " bytes exceeds the configured limit of "
                    + maxBytes + " bytes");
        }

        int nextVersion = documentRepository.findMaxVersionForApplication(app) + 1;
        Document doc = Document.builder()
            .application(app)
            .uploader(uploader)
            .originalFilename(originalFilename)
            .storedFilename(blob.storedFilename())
            .mimeType(mimeType.toLowerCase())
            .sizeBytes(blobSz)
            .versionNumber(nextVersion)
            .build();
        Document saved = documentRepository.save(doc);

        auditService.record(uploader, app, AuditService.ACTION_DOCUMENT_UPLOADED,
            "Uploaded document v" + nextVersion + " (" + originalFilename + ", " + blobSz + " bytes)");
        app.getApplicant().getEmail();
        Optional.ofNullable(app.getAssignedReviewer()).ifPresent(User::getEmail);
        applicationChangeEvents.publish(app);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Document> listForApplication(User caller, Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application " + applicationId + " not found"));
        if (caller.getRole() == Role.APPLICANT
                && !app.getApplicant().getId().equals(caller.getId())) {
            throw new UnauthorizedActionException("Applicants may only view their own documents");
        }
        return documentRepository.findAllByApplicationOrderByVersionNumberAscIdAsc(app);
    }

    @Transactional(readOnly = true)
    public PreparedDocumentDownload prepareDownload(User caller, Long applicationId, Long documentId) {
        applicationService.getByIdForUser(applicationId, caller);
        Document doc = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        if (!doc.getApplication().getId().equals(applicationId)) {
            throw new ResourceNotFoundException("Document not found");
        }
        Path path = storage.resolve(doc.getStoredFilename());
        if (!Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("Stored file is no longer available");
        }
        try {
            return new PreparedDocumentDownload(path, doc.getMimeType(), doc.getOriginalFilename(), Files.size(path));
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read stored file", ex);
        }
    }

    private InputStream safeStream(InputStream stream) {
        InputStream s = Optional.ofNullable(stream).orElseThrow(
            () -> new BusinessRuleViolationException("Document content stream is empty"));
        try {
            s.available();
            return s;
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read uploaded document", ex);
        }
    }
}
