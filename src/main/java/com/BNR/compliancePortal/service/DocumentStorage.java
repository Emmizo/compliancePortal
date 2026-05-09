package com.BNR.compliancePortal.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class DocumentStorage {

    private final Path root;

    public DocumentStorage(DocumentProperties properties) {
        this.root = Paths.get(properties.storageRoot()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not initialise document storage at " + this.root, ex);
        }
    }

    public StoredBlob store(InputStream input, String originalFilename) {
        String storedName = UUID.randomUUID() + extensionOf(originalFilename);
        Path target = root.resolve(storedName).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalStateException("Resolved path escaped storage root");
        }
        try {
            long copied = Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredBlob(storedName, target, copied);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to persist uploaded document", ex);
        }
    }

    public Path resolve(String storedFilename) {
        Path target = root.resolve(storedFilename).normalize();
        if (!target.startsWith(root)) {
            throw new IllegalStateException("Resolved path escaped storage root");
        }
        return target;
    }

    private static String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        String ext = filename.substring(dot);
        if (ext.matches("\\.[A-Za-z0-9]{1,16}")) {
            return ext;
        }
        return "";
    }

    public record StoredBlob(String storedFilename, Path absolutePath, long sizeBytes) {}
}
