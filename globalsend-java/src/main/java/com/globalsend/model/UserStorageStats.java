package com.globalsend.model;

import java.io.Serializable;

public class UserStorageStats implements Serializable {
    private static final long serialVersionUID = 1L;

    private long usedBytes;
    private long maxBytes;
    private int totalItems;
    private int activeItems;
    private int expiredItems;

    public UserStorageStats(long usedBytes, long maxBytes, int totalItems, int activeItems, int expiredItems) {
        this.usedBytes = usedBytes;
        this.maxBytes = maxBytes;
        this.totalItems = totalItems;
        this.activeItems = activeItems;
        this.expiredItems = expiredItems;
    }

    public long getUsedBytes() { return usedBytes; }
    public long getMaxBytes() { return maxBytes; }
    public int getTotalItems() { return totalItems; }
    public int getActiveItems() { return activeItems; }
    public int getExpiredItems() { return expiredItems; }

    public int getPercentUsed() {
        if (maxBytes <= 0) return 0;
        return (int) Math.min(100, Math.round((double) usedBytes / maxBytes * 100));
    }

    public String getFormattedUsed() {
        return formatSize(usedBytes);
    }

    public String getFormattedMax() {
        return formatSize(maxBytes);
    }

    private static String formatSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.1f KB", bytes / 1024.0);
        if (bytes < 1024 * 1024 * 1024) return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
        return String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
    }
}
