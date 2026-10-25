package com.globalsend.model;

import java.io.Serializable;
import java.sql.Timestamp;

/**
 * Tracks physical file objects saved on local disk storage using Java NIO.
 */
public class FileMetadata implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String userId;
    private String itemId;
    private String storageKey;
    private String originalFilename;
    private String sanitizedFilename;
    private String mimeType;
    private long fileSize;
    private Timestamp createdAt;

    public FileMetadata() {}

    public FileMetadata(String id, String userId, String itemId, String storageKey,
                        String originalFilename, String sanitizedFilename, String mimeType, long fileSize) {
        this.id = id;
        this.userId = userId;
        this.itemId = itemId;
        this.storageKey = storageKey;
        this.originalFilename = originalFilename;
        this.sanitizedFilename = sanitizedFilename;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.createdAt = new Timestamp(System.currentTimeMillis());
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getSanitizedFilename() { return sanitizedFilename; }
    public void setSanitizedFilename(String sanitizedFilename) { this.sanitizedFilename = sanitizedFilename; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
