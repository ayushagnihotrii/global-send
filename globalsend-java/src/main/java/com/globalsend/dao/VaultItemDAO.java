package com.globalsend.dao;

import com.globalsend.config.DatabaseConfig;
import com.globalsend.model.VaultItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data Access Object for Vault items.
 * Fully managed with transactions, cross-database timestamp parameterization, and PreparedStatements.
 */
public class VaultItemDAO {

    private final TagDAO tagDAO = new TagDAO();

    public boolean create(VaultItem item) {
        String sql = """
            INSERT INTO items (
                id, user_id, type, title, content, url, storage_key, file_name,
                mime_type, file_size, is_favorite, is_pinned, is_archived,
                created_at, expires_at, expiration_duration_sec
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, item.getId());
            ps.setString(2, item.getUserId());
            ps.setString(3, item.getType());
            ps.setString(4, item.getTitle());
            ps.setString(5, item.getContent());
            ps.setString(6, item.getUrl());
            ps.setString(7, item.getStorageKey());
            ps.setString(8, item.getFileName());
            ps.setString(9, item.getMimeType());
            ps.setLong(10, item.getFileSize());
            ps.setBoolean(11, item.isFavorite());
            ps.setBoolean(12, item.isPinned());
            ps.setBoolean(13, item.isArchived());
            ps.setTimestamp(14, item.getCreatedAt());
            ps.setTimestamp(15, item.getExpiresAt());
            ps.setInt(16, item.getExpirationDurationSec());

            boolean success = ps.executeUpdate() > 0;
            if (success && item.getTags() != null) {
                for (var tag : item.getTags()) {
                    var persistedTag = tagDAO.findOrCreateTag(tag.getName());
                    tagDAO.linkTagToItem(item.getId(), persistedTag.getId());
                }
            }
            return success;
        } catch (SQLException e) {
            throw new RuntimeException("Error inserting vault item: " + item.getTitle(), e);
        }
    }

    public Optional<VaultItem> findById(String id) {
        String sql = "SELECT * FROM items WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    VaultItem item = mapResultSetToItem(rs);
                    item.setTags(tagDAO.findTagsByItemId(item.getId()));
                    return Optional.of(item);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error loading vault item by ID: " + id, e);
        }
        return Optional.empty();
    }

    public List<VaultItem> findByUserId(String userId, String filterType, String searchQuery, boolean includeExpired) {
        List<VaultItem> items = new ArrayList<>();
        StringBuilder sql = new StringBuilder("SELECT * FROM items WHERE user_id = ?");

        Timestamp now = new Timestamp(System.currentTimeMillis());
        if (!includeExpired) {
            sql.append(" AND (expires_at IS NULL OR expires_at > ?)");
        }
        if (filterType != null && !filterType.isBlank() && !filterType.equalsIgnoreCase("all")) {
            sql.append(" AND type = ?");
        }
        if (searchQuery != null && !searchQuery.isBlank()) {
            sql.append(" AND (LOWER(title) LIKE LOWER(?) OR LOWER(content) LIKE LOWER(?))");
        }
        sql.append(" ORDER BY is_pinned DESC, created_at DESC");

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            int idx = 1;
            ps.setString(idx++, userId);

            if (!includeExpired) {
                ps.setTimestamp(idx++, now);
            }
            if (filterType != null && !filterType.isBlank() && !filterType.equalsIgnoreCase("all")) {
                ps.setString(idx++, filterType.toLowerCase());
            }
            if (searchQuery != null && !searchQuery.isBlank()) {
                String pattern = "%" + searchQuery.trim() + "%";
                ps.setString(idx++, pattern);
                ps.setString(idx++, pattern);
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    VaultItem item = mapResultSetToItem(rs);
                    item.setTags(tagDAO.findTagsByItemId(item.getId()));
                    items.add(item);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error querying vault items for user: " + userId, e);
        }
        return items;
    }

    public List<VaultItem> findSharedWithUser(String userId) {
        List<VaultItem> items = new ArrayList<>();
        String sql = """
            SELECT i.* FROM items i
            INNER JOIN item_shares s ON i.id = s.item_id
            WHERE s.shared_with_user_id = ? AND (i.expires_at IS NULL OR i.expires_at > ?)
            ORDER BY s.created_at DESC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, userId);
            ps.setTimestamp(2, new Timestamp(System.currentTimeMillis()));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    VaultItem item = mapResultSetToItem(rs);
                    item.setTags(tagDAO.findTagsByItemId(item.getId()));
                    items.add(item);
                }
            }
        } catch (SQLException e) {
            System.err.println("[VaultItemDAO] Error loading shared items: " + e.getMessage());
        }
        return items;
    }

    public boolean update(VaultItem item) {
        String sql = """
            UPDATE items SET 
                title = ?, content = ?, url = ?, is_favorite = ?, is_pinned = ?, is_archived = ?
            WHERE id = ? AND user_id = ?
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, item.getTitle());
            ps.setString(2, item.getContent());
            ps.setString(3, item.getUrl());
            ps.setBoolean(4, item.isFavorite());
            ps.setBoolean(5, item.isPinned());
            ps.setBoolean(6, item.isArchived());
            ps.setString(7, item.getId());
            ps.setString(8, item.getUserId());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error updating vault item: " + item.getId(), e);
        }
    }

    public boolean delete(String id, String userId) {
        String sql = "DELETE FROM items WHERE id = ? AND user_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error deleting vault item: " + id, e);
        }
    }

    public boolean toggleFavorite(String id, String userId) {
        String sql = "UPDATE items SET is_favorite = (CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END) WHERE id = ? AND user_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error toggling favorite for item: " + id, e);
        }
    }

    public boolean togglePin(String id, String userId) {
        String sql = "UPDATE items SET is_pinned = (CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END) WHERE id = ? AND user_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            ps.setString(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error toggling pin for item: " + id, e);
        }
    }

    public List<VaultItem> findExpiredItems() {
        List<VaultItem> list = new ArrayList<>();
        String sql = "SELECT * FROM items WHERE expires_at IS NOT NULL AND expires_at <= ? LIMIT 100";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setTimestamp(1, new Timestamp(System.currentTimeMillis()));
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToItem(rs));
                }
            }
        } catch (SQLException e) {
            System.err.println("[VaultItemDAO] Error checking expired items: " + e.getMessage());
        }
        return list;
    }

    public int deleteExpiredItemsBatch(List<String> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) return 0;
        StringBuilder sql = new StringBuilder("DELETE FROM items WHERE id IN (");
        for (int i = 0; i < itemIds.size(); i++) {
            sql.append(i == 0 ? "?" : ", ?");
        }
        sql.append(")");

        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            for (int i = 0; i < itemIds.size(); i++) {
                ps.setString(i + 1, itemIds.get(i));
            }
            return ps.executeUpdate();
        } catch (SQLException e) {
            System.err.println("[VaultItemDAO] Error executing batch deletion: " + e.getMessage());
            return 0;
        }
    }

    private VaultItem mapResultSetToItem(ResultSet rs) throws SQLException {
        VaultItem item = new VaultItem();
        item.setId(rs.getString("id"));
        item.setUserId(rs.getString("user_id"));
        item.setType(rs.getString("type"));
        item.setTitle(rs.getString("title"));
        item.setContent(rs.getString("content"));
        item.setUrl(rs.getString("url"));
        item.setStorageKey(rs.getString("storage_key"));
        item.setFileName(rs.getString("file_name"));
        item.setMimeType(rs.getString("mime_type"));
        item.setFileSize(rs.getLong("file_size"));
        item.setFavorite(rs.getBoolean("is_favorite"));
        item.setPinned(rs.getBoolean("is_pinned"));
        item.setArchived(rs.getBoolean("is_archived"));
        item.setCreatedAt(rs.getTimestamp("created_at"));
        item.setExpiresAt(rs.getTimestamp("expires_at"));
        item.setExpirationDurationSec(rs.getInt("expiration_duration_sec"));
        return item;
    }
}
