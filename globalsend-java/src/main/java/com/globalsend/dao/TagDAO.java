package com.globalsend.dao;

import com.globalsend.config.DatabaseConfig;
import com.globalsend.model.Tag;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TagDAO {

    public Tag findOrCreateTag(String name) {
        String cleanName = name.trim();
        String selectSql = "SELECT id, name FROM tags WHERE LOWER(name) = LOWER(?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(selectSql)) {
            ps.setString(1, cleanName);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new Tag(rs.getString("id"), rs.getString("name"));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error searching tag: " + cleanName, e);
        }

        // Tag does not exist, insert new
        String id = UUID.randomUUID().toString();
        String insertSql = "INSERT INTO tags (id, name) VALUES (?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(insertSql)) {
            ps.setString(1, id);
            ps.setString(2, cleanName);
            ps.executeUpdate();
            return new Tag(id, cleanName);
        } catch (SQLException e) {
            // Check race condition
            return findOrCreateTag(cleanName);
        }
    }

    public void linkTagToItem(String itemId, String tagId) {
        String sql = "INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            ps.setString(2, tagId);
            ps.executeUpdate();
        } catch (SQLException ignored) {
            // Already linked
        }
    }

    public List<Tag> findTagsByItemId(String itemId) {
        List<Tag> tags = new ArrayList<>();
        String sql = "SELECT t.id, t.name FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    tags.add(new Tag(rs.getString("id"), rs.getString("name")));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error loading tags for item: " + itemId, e);
        }
        return tags;
    }

    public void removeTagsFromItem(String itemId) {
        String sql = "DELETE FROM item_tags WHERE item_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Error deleting item tags: " + itemId, e);
        }
    }
}
