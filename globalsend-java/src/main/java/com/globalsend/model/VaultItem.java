package com.globalsend.model;

import java.io.Serializable;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Model representing a GlobalSend Vault item.
 * Supports: 'text', 'link', 'image', 'video', 'file'.
 * Includes time-based auto-expiration attributes.
 */
public class VaultItem implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String userId;
    private String type; // 'text', 'link', 'image', 'video', 'file'
    private String title;
    private String content;
    private String url;
    private String storageKey;
    private String fileName;
    private String mimeType;
    private long fileSize;
    private boolean favorite;
    private boolean pinned;
    private boolean archived;
    private Timestamp createdAt;
    private Timestamp expiresAt;
    private int expirationDurationSec;
    private List<Tag> tags = new ArrayList<>();

    public VaultItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public boolean isFavorite() { return favorite; }
    public void setFavorite(boolean favorite) { this.favorite = favorite; }

    public boolean isPinned() { return pinned; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }

    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Timestamp expiresAt) { this.expiresAt = expiresAt; }

    public int getExpirationDurationSec() { return expirationDurationSec; }
    public void setExpirationDurationSec(int expirationDurationSec) { this.expirationDurationSec = expirationDurationSec; }

    public List<Tag> getTags() { return tags; }
    public void setTags(List<Tag> tags) { this.tags = tags; }

    public boolean isExpired() {
        if (expiresAt == null) return false;
        return expiresAt.toInstant().isBefore(Instant.now());
    }

    public long getRemainingSeconds() {
        if (expiresAt == null) return Long.MAX_VALUE;
        long diff = expiresAt.toInstant().getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, diff);
    }

    public String getFormattedRemainingTime() {
        long sec = getRemainingSeconds();
        if (sec <= 0) return "Expired";
        if (sec < 60) return sec + "s left";
        if (sec < 3600) return (sec / 60) + "m left";
        if (sec < 86400) return (sec / 3600) + "h " + ((sec % 3600) / 60) + "m left";
        return (sec / 86400) + "d " + ((sec % 86400) / 3600) + "h left";
    }

    public String getFormattedFileSize() {
        if (fileSize <= 0) return "";
        if (fileSize < 1024) return fileSize + " B";
        if (fileSize < 1024 * 1024) return String.format("%.1f KB", fileSize / 1024.0);
        return String.format("%.2f MB", fileSize / (1024.0 * 1024.0));
    }
}
