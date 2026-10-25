package com.globalsend.model;

import java.io.Serializable;
import java.sql.Timestamp;

/**
 * Model representing an authenticated GlobalSend user account.
 * Accounts are protected via secret key hashing and unique fingerprints.
 */
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String username;
    private String displayUsername;
    private String passwordHash;
    private String keyFingerprint;
    private long storageUsedBytes;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public User() {}

    public User(String id, String username, String displayUsername, String passwordHash, String keyFingerprint) {
        this.id = id;
        this.username = username;
        this.displayUsername = displayUsername;
        this.passwordHash = passwordHash;
        this.keyFingerprint = keyFingerprint;
        this.storageUsedBytes = 0;
        this.createdAt = new Timestamp(System.currentTimeMillis());
        this.updatedAt = new Timestamp(System.currentTimeMillis());
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getDisplayUsername() { return displayUsername; }
    public void setDisplayUsername(String displayUsername) { this.displayUsername = displayUsername; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getKeyFingerprint() { return keyFingerprint; }
    public void setKeyFingerprint(String keyFingerprint) { this.keyFingerprint = keyFingerprint; }

    public long getStorageUsedBytes() { return storageUsedBytes; }
    public void setStorageUsedBytes(long storageUsedBytes) { this.storageUsedBytes = storageUsedBytes; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }

    public String getFormattedStorage() {
        if (storageUsedBytes < 1024) return storageUsedBytes + " B";
        if (storageUsedBytes < 1024 * 1024) return String.format("%.1f KB", storageUsedBytes / 1024.0);
        if (storageUsedBytes < 1024 * 1024 * 1024) return String.format("%.2f MB", storageUsedBytes / (1024.0 * 1024.0));
        return String.format("%.2f GB", storageUsedBytes / (1024.0 * 1024.0 * 1024.0));
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", username='" + username + '\'' +
                ", displayUsername='" + displayUsername + '\'' +
                ", keyFingerprint='" + keyFingerprint + '\'' +
                '}';
    }
}
