package com.globalsend.dao;

import com.globalsend.config.DatabaseConfig;
import com.globalsend.model.FileMetadata;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

public class FileMetadataDAO {

    public boolean create(FileMetadata file) {
        String sql = "INSERT INTO files (id, user_id, item_id, storage_key, original_filename, sanitized_filename, mime_type, file_size, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, file.getId());
            ps.setString(2, file.getUserId());
            ps.setString(3, file.getItemId());
            ps.setString(4, file.getStorageKey());
            ps.setString(5, file.getOriginalFilename());
            ps.setString(6, file.getSanitizedFilename());
            ps.setString(7, file.getMimeType());
            ps.setLong(8, file.getFileSize());
            ps.setTimestamp(9, file.getCreatedAt());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error inserting file metadata", e);
        }
    }

    public Optional<FileMetadata> findByItemId(String itemId) {
        String sql = "SELECT * FROM files WHERE item_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error querying file metadata for item: " + itemId, e);
        }
        return Optional.empty();
    }

    public Optional<FileMetadata> findByStorageKey(String storageKey) {
        String sql = "SELECT * FROM files WHERE storage_key = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, storageKey);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSet(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error querying file metadata by key: " + storageKey, e);
        }
        return Optional.empty();
    }

    public boolean deleteByItemId(String itemId) {
        String sql = "DELETE FROM files WHERE item_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error deleting file metadata: " + itemId, e);
        }
    }

    private FileMetadata mapResultSet(ResultSet rs) throws SQLException {
        FileMetadata f = new FileMetadata();
        f.setId(rs.getString("id"));
        f.setUserId(rs.getString("user_id"));
        f.setItemId(rs.getString("item_id"));
        f.setStorageKey(rs.getString("storage_key"));
        f.setOriginalFilename(rs.getString("original_filename"));
        f.setSanitizedFilename(rs.getString("sanitized_filename"));
        f.setMimeType(rs.getString("mime_type"));
        f.setFileSize(rs.getLong("file_size"));
        f.setCreatedAt(rs.getTimestamp("created_at"));
        return f;
    }
}
