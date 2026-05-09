package com.BNR.compliancePortal.service;

import java.nio.file.Path;

public record PreparedDocumentDownload(Path path, String mimeType, String originalFilename, long sizeBytes) {}
