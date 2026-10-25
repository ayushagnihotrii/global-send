package com.globalsend.dao;

import com.globalsend.config.DatabaseConfig;
import com.globalsend.model.User;
import com.globalsend.model.UserStorageStats;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data Access Object for User accounts.
 * Utilizes JDBC PreparedStatements with parameter binding to prevent SQL injection.
 */
public class UserDAO {

    public Optional<User> findById(String id) {
        String sql = "SELECT id, username, display_username, password_hash, key_fingerprint, storage_used_bytes, created_at, updated_at FROM users WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToUser(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error querying user by ID: " + id, e);
        }
        return Optional.empty();
    }

    public Optional<User> findByUsername(String username) {
        String sql = "SELECT id, username, display_username, password_hash, key_fingerprint, storage_used_bytes, created_at, updated_at FROM users WHERE LOWER(username) = LOWER(?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapResultSetToUser(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error querying user by username: " + username, e);
        }
        return Optional.empty();
    }

    public boolean create(User user) {
        String sql = "INSERT INTO users (id, username, display_username, password_hash, key_fingerprint, storage_used_bytes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, user.getId());
            ps.setString(2, user.getUsername());
            ps.setString(3, user.getDisplayUsername());
            ps.setString(4, user.getPasswordHash());
            ps.setString(5, user.getKeyFingerprint());
            ps.setLong(6, user.getStorageUsedBytes());
            ps.setTimestamp(7, user.getCreatedAt());
            ps.setTimestamp(8, user.getUpdatedAt());
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Error inserting user: " + user.getUsername(), e);
        }
    }

    public void updateStorageUsed(String userId, long deltaBytes) {
        String sql = "UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes + ?), updated_at = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, deltaBytes);
            ps.setTimestamp(2, new Timestamp(System.currentTimeMillis()));
            ps.setString(3, userId);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Error updating user storage: " + userId, e);
        }
    }

    public UserStorageStats getUserStorageStats(String userId, long maxStorageLimit) {
        String sql = """
            SELECT 
                u.storage_used_bytes,
                COUNT(i.id) AS total_items,
                SUM(CASE WHEN i.expires_at > ? THEN 1 ELSE 0 END) AS active_items,
                SUM(CASE WHEN i.expires_at <= ? THEN 1 ELSE 0 END) AS expired_items
            FROM users u
            LEFT JOIN items i ON u.id = i.user_id
            WHERE u.id = ?
            GROUP BY u.id, u.storage_used_bytes
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            Timestamp now = new Timestamp(System.currentTimeMillis());
            ps.setTimestamp(1, now);
            ps.setTimestamp(2, now);
            ps.setString(3, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    long used = rs.getLong("storage_used_bytes");
                    int total = rs.getInt("total_items");
                    int active = rs.getInt("active_items");
                    int expired = rs.getInt("expired_items");
                    return new UserStorageStats(used, maxStorageLimit, total, active, expired);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error retrieving storage statistics for user: " + userId, e);
        }
        return new UserStorageStats(0, maxStorageLimit, 0, 0, 0);
    }

    public List<User> searchUsers(String query, String excludeUserId) {
        List<User> list = new ArrayList<>();
        String sql = "SELECT id, username, display_username, password_hash, key_fingerprint, storage_used_bytes, created_at, updated_at " +
                     "FROM users WHERE id != ? AND (LOWER(username) LIKE LOWER(?) OR LOWER(display_username) LIKE LOWER(?)) LIMIT 20";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, excludeUserId != null ? excludeUserId : "");
            ps.setString(2, "%" + query + "%");
            ps.setString(3, "%" + query + "%");
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToUser(rs));
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error searching users", e);
        }
        return list;
    }

    private User mapResultSetToUser(ResultSet rs) throws SQLException {
        User u = new User();
        u.setId(rs.getString("id"));
        u.setUsername(rs.getString("username"));
        u.setDisplayUsername(rs.getString("display_username"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setKeyFingerprint(rs.getString("key_fingerprint"));
        u.setStorageUsedBytes(rs.getLong("storage_used_bytes"));
        u.setCreatedAt(rs.getTimestamp("created_at"));
        u.setUpdatedAt(rs.getTimestamp("updated_at"));
        return u;
    }
}
