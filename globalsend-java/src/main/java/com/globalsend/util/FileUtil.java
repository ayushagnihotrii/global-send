package com.globalsend.util;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.UUID;

/**
 * Advanced Java NIO File Management Utility.
 * Provides resilient, zero-copy, path-traversal-safe file storage and streaming.
 */
public final class FileUtil {

    private FileUtil() {}

    /**
     * Sanitizes untrusted user filename to prevent path traversal and shell injection.
     */
    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "unnamed_file_" + System.currentTimeMillis();
        }
        // Extract base name only (strip path prefixes)
        String baseName = Paths.get(filename).getFileName().toString();
        // Remove dangerous characters
        baseName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (baseName.isBlank() || baseName.equals(".") || baseName.equals("..")) {
            return "file_" + UUID.randomUUID().toString().substring(0, 8);
        }
        return baseName;
    }

    /**
     * Saves an incoming input stream to the target directory using Java NIO Files.copy.
     * Prevents path traversal via absolute path verification.
     */
    public static Path saveFileStream(InputStream inputStream, Path uploadDir, String storageKey) throws IOException {
        Files.createDirectories(uploadDir);
        Path targetPath = uploadDir.resolve(storageKey).normalize().toAbsolutePath();

        // Path Traversal Security Check
        if (!targetPath.startsWith(uploadDir.toAbsolutePath())) {
            throw new SecurityException("Attempted Path Traversal attack detected: " + storageKey);
        }

        Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        return targetPath;
    }

    /**
     * Safely deletes a file if it exists.
     */
    public static boolean deleteFileSafely(Path uploadDir, String storageKey) {
        if (storageKey == null || storageKey.isBlank()) return false;
        try {
            Path targetPath = uploadDir.resolve(storageKey).normalize().toAbsolutePath();
            if (!targetPath.startsWith(uploadDir.toAbsolutePath())) {
                return false;
            }
            return Files.deleteIfExists(targetPath);
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Resolves and verifies a file path safely within the upload base directory.
     */
    public static Path resolveSafePath(Path uploadDir, String storageKey) throws IOException {
        Path targetPath = uploadDir.resolve(storageKey).normalize().toAbsolutePath();
        if (!targetPath.startsWith(uploadDir.toAbsolutePath())) {
            throw new SecurityException("Access outside upload directory forbidden: " + storageKey);
        }
        if (!Files.exists(targetPath) || !Files.isRegularFile(targetPath)) {
            throw new NoSuchFileException("Target file not found: " + storageKey);
        }
        return targetPath;
    }

    /**
     * Guesses MIME type from path and file name.
     */
    public static String detectMimeType(Path path, String fallbackFilename) {
        try {
            String mime = Files.probeContentType(path);
            if (mime != null && !mime.isBlank()) return mime;
        } catch (IOException ignored) {}

        String lower = fallbackFilename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".zip")) return "application/zip";
        if (lower.endsWith(".txt")) return "text/plain";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".java")) return "text/x-java-source";
        return "application/octet-stream";
    }
}
