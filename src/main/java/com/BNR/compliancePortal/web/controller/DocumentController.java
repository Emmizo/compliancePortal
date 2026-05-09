package com.BNR.compliancePortal.web.controller;

import com.BNR.compliancePortal.domain.Document;
import com.BNR.compliancePortal.domain.User;
import com.BNR.compliancePortal.security.CurrentUserResolver;
import com.BNR.compliancePortal.service.DocumentService;
import com.BNR.compliancePortal.service.PreparedDocumentDownload;
import com.BNR.compliancePortal.web.dto.DocumentDtos.DocumentResponse;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/applications/{applicationId}/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final CurrentUserResolver currentUserResolver;

    public DocumentController(DocumentService documentService,
                              CurrentUserResolver currentUserResolver) {
        this.documentService = documentService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('ROLE_APPLICANT')")
    public ResponseEntity<DocumentResponse> upload(@PathVariable Long applicationId,
                                                   @RequestParam("file") MultipartFile file) {
        User caller = currentUserResolver.requireCurrentUser();
        try {
            Document saved = documentService.upload(
                caller,
                applicationId,
                file.getInputStream(),
                file.getSize(),
                file.getOriginalFilename(),
                file.getContentType());
            return ResponseEntity.status(HttpStatus.CREATED).body(DocumentResponse.from(saved));
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> list(@PathVariable Long applicationId) {
        User caller = currentUserResolver.requireCurrentUser();
        return ResponseEntity.ok(documentService.listForApplication(caller, applicationId).stream()
            .map(DocumentResponse::from).toList());
    }

    @GetMapping("/{documentId}/file")
    public ResponseEntity<Resource> download(
        @PathVariable Long applicationId,
        @PathVariable Long documentId,
        @RequestParam(defaultValue = "false") boolean attachment) {
        User caller = currentUserResolver.requireCurrentUser();
        PreparedDocumentDownload meta = documentService.prepareDownload(caller, applicationId, documentId);
        Resource body = new FileSystemResource(meta.path());
        ContentDisposition disposition = attachment
            ? ContentDisposition.attachment()
                .filename(meta.originalFilename(), StandardCharsets.UTF_8)
                .build()
            : ContentDisposition.inline()
                .filename(meta.originalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
            .contentType(MediaType.parseMediaType(meta.mimeType()))
            .contentLength(meta.sizeBytes())
            .body(body);
    }
}
