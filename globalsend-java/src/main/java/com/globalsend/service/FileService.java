package com.globalsend.service;

import com.globalsend.config.AppConfig;
import com.globalsend.dao.ChatDAO;
import com.globalsend.dao.FileMetadataDAO;
import com.globalsend.dao.TagDAO;
import com.globalsend.dao.UserDAO;
import com.globalsend.dao.VaultItemDAO;
import com.globalsend.model.FileMetadata;
import com.globalsend.model.Tag;
import com.globalsend.model.VaultItem;
import com.globalsend.util.ExpirationUtil;
import com.globalsend.util.FileUtil;
import jakarta.servlet.http.Part;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * High-performance file management service backed by Java NIO.
 */
public class FileService {

    private final VaultItemDAO itemDAO;
    private final FileMetadataDAO fileDAO;
    private final UserDAO userDAO;
    private final TagDAO tagDAO;
    private final ChatDAO chatDAO;
    private final Path uploadDir;

    public FileService() {
        this.itemDAO = new VaultItemDAO();
        this.fileDAO = new FileMetadataDAO();
        this.userDAO = new UserDAO();
        this.tagDAO = new TagDAO();
        this.chatDAO = new ChatDAO();
        this.uploadDir = Paths.get(AppConfig.getUploadDir()).toAbsolutePath().normalize();
    }

    /**
     * Stores an uploaded multipart file using Java NIO streaming and registers it in the vault.
     */
    public VaultItem saveUploadedFile(String userId, Part part, String customTitle, String durationStr, String tagNames) throws IOException {
        long fileSize = part.getSize();
        if (fileSize <= 0) {
            throw new IllegalArgumentException("Cannot upload empty file");
        }
        if (fileSize > AppConfig.getMaxFileSizeBytes()) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of " + (AppConfig.getMaxFileSizeBytes() / (1024 * 1024)) + " MB");
        }

        String submittedFileName = part.getSubmittedFileName();
        String originalFilename = submittedFileName != null ? submittedFileName : "file";
        String sanitizedFilename = FileUtil.sanitizeFilename(originalFilename);
        String storageKey = UUID.randomUUID().toString() + "_" + sanitizedFilename;

        // Save physical file using Java NIO
        try (InputStream in = part.getInputStream()) {
            FileUtil.saveFileStream(in, uploadDir, storageKey);
        }

        Path savedFilePath = uploadDir.resolve(storageKey);
        String mimeType = FileUtil.detectMimeType(savedFilePath, sanitizedFilename);

        // Determine item category
        String itemType = "file";
        if (mimeType.startsWith("image/")) {
            itemType = "image";
        } else if (mimeType.startsWith("video/")) {
            itemType = "video";
        }

        int durationSec = ExpirationUtil.parseDurationString(durationStr);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp expiresAt = ExpirationUtil.calculateExpiresAt(durationSec);

        String title = (customTitle != null && !customTitle.isBlank()) ? customTitle.trim() : originalFilename;
        String itemId = UUID.randomUUID().toString();

        VaultItem item = new VaultItem();
        item.setId(itemId);
        item.setUserId(userId);
        item.setType(itemType);
        item.setTitle(title);
        item.setStorageKey(storageKey);
        item.setFileName(originalFilename);
        item.setMimeType(mimeType);
        item.setFileSize(fileSize);
        item.setCreatedAt(now);
        item.setExpiresAt(expiresAt);
        item.setExpirationDurationSec(durationSec);
        item.setTags(parseTags(tagNames));

        itemDAO.create(item);

        FileMetadata fileMeta = new FileMetadata(
                UUID.randomUUID().toString(),
                userId,
                itemId,
                storageKey,
                originalFilename,
                sanitizedFilename,
                mimeType,
                fileSize
        );
        fileDAO.create(fileMeta);

        userDAO.updateStorageUsed(userId, fileSize);
        return item;
    }

    public record DownloadResource(Path filePath, String originalFilename, String mimeType, long fileSize) {}

    public Optional<DownloadResource> getDownloadResource(String itemId, String userId) {
        Optional<VaultItem> itemOpt = itemDAO.findById(itemId);
        if (itemOpt.isEmpty()) {
            return Optional.empty();
        }

        VaultItem item = itemOpt.get();
        // Allow download if user is owner OR if item was shared with user!
        boolean isOwner = item.getUserId().equals(userId);
        boolean isShared = chatDAO.isItemSharedWithUser(itemId, userId);

        if (!isOwner && !isShared) {
            return Optional.empty();
        }

        if (item.getStorageKey() == null) {
            return Optional.empty();
        }

        try {
            Path safePath = FileUtil.resolveSafePath(uploadDir, item.getStorageKey());
            return Optional.of(new DownloadResource(
                    safePath,
                    item.getFileName() != null ? item.getFileName() : safePath.getFileName().toString(),
                    item.getMimeType() != null ? item.getMimeType() : "application/octet-stream",
                    item.getFileSize()
            ));
        } catch (IOException e) {
            System.err.println("[FileService] Error resolving file on disk: " + e.getMessage());
            return Optional.empty();
        }
    }

    public boolean deletePhysicalFile(String storageKey) {
        return FileUtil.deleteFileSafely(uploadDir, storageKey);
    }

    private List<Tag> parseTags(String tagNames) {
        List<Tag> list = new ArrayList<>();
        if (tagNames != null && !tagNames.isBlank()) {
            String[] parts = tagNames.split("[, ]+");
            for (String p : parts) {
                if (!p.isBlank()) {
                    list.add(new Tag(null, p.trim()));
                }
            }
        }
        return list;
    }
}
