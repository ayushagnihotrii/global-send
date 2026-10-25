package com.globalsend.service;

import com.globalsend.config.AppConfig;
import com.globalsend.dao.ChatDAO;
import com.globalsend.dao.FileMetadataDAO;
import com.globalsend.dao.TagDAO;
import com.globalsend.dao.UserDAO;
import com.globalsend.dao.VaultItemDAO;
import com.globalsend.model.Tag;
import com.globalsend.model.User;
import com.globalsend.model.UserStorageStats;
import com.globalsend.model.VaultItem;
import com.globalsend.util.ExpirationUtil;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service managing core vault items (notes, links, media, files) and metadata.
 */
public class VaultService {

    private final VaultItemDAO itemDAO;
    private final FileMetadataDAO fileDAO;
    private final TagDAO tagDAO;
    private final UserDAO userDAO;
    private final ChatDAO chatDAO;

    public VaultService() {
        this.itemDAO = new VaultItemDAO();
        this.fileDAO = new FileMetadataDAO();
        this.tagDAO = new TagDAO();
        this.userDAO = new UserDAO();
        this.chatDAO = new ChatDAO();
    }

    public VaultItem createTextItem(String userId, String title, String content, String durationStr, String tagNames) {
        int durationSec = ExpirationUtil.parseDurationString(durationStr);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp expiresAt = ExpirationUtil.calculateExpiresAt(durationSec);

        VaultItem item = new VaultItem();
        item.setId(UUID.randomUUID().toString());
        item.setUserId(userId);
        item.setType("text");
        item.setTitle(title != null && !title.isBlank() ? title.trim() : "Untitled Note");
        item.setContent(content != null ? content.trim() : "");
        item.setFileSize(item.getContent().getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
        item.setCreatedAt(now);
        item.setExpiresAt(expiresAt);
        item.setExpirationDurationSec(durationSec);
        item.setTags(parseTags(tagNames));

        itemDAO.create(item);
        userDAO.updateStorageUsed(userId, item.getFileSize());
        return item;
    }

    public VaultItem createLinkItem(String userId, String title, String url, String notes, String durationStr, String tagNames) {
        int durationSec = ExpirationUtil.parseDurationString(durationStr);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        Timestamp expiresAt = ExpirationUtil.calculateExpiresAt(durationSec);

        VaultItem item = new VaultItem();
        item.setId(UUID.randomUUID().toString());
        item.setUserId(userId);
        item.setType("link");
        item.setTitle(title != null && !title.isBlank() ? title.trim() : url);
        item.setUrl(url != null ? url.trim() : "");
        item.setContent(notes != null ? notes.trim() : "");
        item.setFileSize(0);
        item.setCreatedAt(now);
        item.setExpiresAt(expiresAt);
        item.setExpirationDurationSec(durationSec);
        item.setTags(parseTags(tagNames));

        itemDAO.create(item);
        return item;
    }

    public List<VaultItem> getUserVaultItems(String userId, String filterType, String searchQuery) {
        return itemDAO.findByUserId(userId, filterType, searchQuery, false);
    }

    public List<VaultItem> getItemsSharedWithUser(String userId) {
        return itemDAO.findSharedWithUser(userId);
    }

    public Optional<VaultItem> getItemDetails(String itemId, String userId) {
        Optional<VaultItem> itemOpt = itemDAO.findById(itemId);
        if (itemOpt.isPresent()) {
            VaultItem item = itemOpt.get();
            // Ownership or shared permission check
            if (item.getUserId().equals(userId) || chatDAO.isItemSharedWithUser(itemId, userId)) {
                return Optional.of(item);
            }
        }
        return Optional.empty();
    }

    public User shareItemWithUser(String itemId, String ownerId, String targetUsername) {
        Optional<VaultItem> itemOpt = itemDAO.findById(itemId);
        if (itemOpt.isEmpty() || !itemOpt.get().getUserId().equals(ownerId)) {
            throw new IllegalArgumentException("Item not found or unauthorized");
        }

        Optional<User> targetOpt = userDAO.findByUsername(targetUsername.trim());
        if (targetOpt.isEmpty()) {
            throw new IllegalArgumentException("User @" + targetUsername + " not found");
        }

        User target = targetOpt.get();
        if (target.getId().equals(ownerId)) {
            throw new IllegalArgumentException("Cannot share an item with yourself");
        }

        chatDAO.shareItem(itemId, ownerId, target.getId());
        return target;
    }

    public boolean deleteItem(String itemId, String userId) {
        Optional<VaultItem> itemOpt = itemDAO.findById(itemId);
        if (itemOpt.isPresent() && itemOpt.get().getUserId().equals(userId)) {
            VaultItem item = itemOpt.get();
            long size = item.getFileSize();

            boolean deleted = itemDAO.delete(itemId, userId);
            if (deleted) {
                userDAO.updateStorageUsed(userId, -size);
            }
            return deleted;
        }
        return false;
    }

    public boolean toggleFavorite(String itemId, String userId) {
        return itemDAO.toggleFavorite(itemId, userId);
    }

    public boolean togglePin(String itemId, String userId) {
        return itemDAO.togglePin(itemId, userId);
    }

    public UserStorageStats getStorageStats(String userId) {
        return userDAO.getUserStorageStats(userId, AppConfig.getMaxFileSizeBytes());
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
