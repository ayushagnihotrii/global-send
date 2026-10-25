package com.globalsend.service;

import com.globalsend.config.AppConfig;
import com.globalsend.dao.UserDAO;
import com.globalsend.dao.VaultItemDAO;
import com.globalsend.model.VaultItem;
import com.globalsend.util.FileUtil;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Advanced Java Concurrency & Background Processing Showcase.
 * Uses ScheduledExecutorService to periodically purge expired vault items
 * and their associated physical disk files using Java NIO.
 */
public class FileExpirationService {

    private final ScheduledExecutorService scheduler;
    private final VaultItemDAO itemDAO;
    private final UserDAO userDAO;
    private final Path uploadDir;
    private volatile boolean isRunning = false;

    public FileExpirationService() {
        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "GlobalSend-FileExpirationCleaner");
            t.setDaemon(true);
            return t;
        });
        this.itemDAO = new VaultItemDAO();
        this.userDAO = new UserDAO();
        this.uploadDir = Paths.get(AppConfig.getUploadDir()).toAbsolutePath().normalize();
    }

    public synchronized void start() {
        if (isRunning) return;
        isRunning = true;
        int intervalSeconds = AppConfig.getExpirationCleanupInterval();
        System.out.println("[FileExpirationService] Starting periodic background cleaner thread. Interval: " + intervalSeconds + "s");

        // Schedule periodic task
        scheduler.scheduleWithFixedDelay(this::runCleanupCycle, 10, intervalSeconds, TimeUnit.SECONDS);
    }

    public synchronized void stop() {
        if (!isRunning) return;
        isRunning = false;
        System.out.println("[FileExpirationService] Shutting down background cleaner thread pool...");
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public int runCleanupCycle() {
        try {
            List<VaultItem> expiredItems = itemDAO.findExpiredItems();
            if (expiredItems.isEmpty()) {
                return 0;
            }

            System.out.println("[FileExpirationService] Found " + expiredItems.size() + " expired vault item(s) for cleanup.");
            List<String> idsToDelete = new ArrayList<>();

            for (VaultItem item : expiredItems) {
                // Delete physical file from disk via Java NIO
                if (item.getStorageKey() != null && !item.getStorageKey().isBlank()) {
                    boolean fileDeleted = FileUtil.deleteFileSafely(uploadDir, item.getStorageKey());
                    if (fileDeleted) {
                        System.out.println("[FileExpirationService] Purged expired disk file: " + item.getStorageKey());
                    }
                }

                // Restore user storage balance
                if (item.getFileSize() > 0) {
                    userDAO.updateStorageUsed(item.getUserId(), -item.getFileSize());
                }

                idsToDelete.add(item.getId());
            }

            // Batch delete database rows
            int deletedCount = itemDAO.deleteExpiredItemsBatch(idsToDelete);
            System.out.println("[FileExpirationService] Successfully purged " + deletedCount + " expired items from database.");
            return deletedCount;
        } catch (Exception e) {
            System.err.println("[FileExpirationService] Exception during cleanup cycle: " + e.getMessage());
            return 0;
        }
    }

    public boolean isRunning() {
        return isRunning;
    }
}
