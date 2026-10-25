package com.globalsend.dao;

import com.globalsend.config.DatabaseConfig;
import com.globalsend.model.ChatMessage;
import com.globalsend.model.Conversation;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ChatDAO {

    public Conversation getOrCreateConversation(String currentUserId, String targetUserId) {
        // Enforce deterministic pair ordering to avoid duplicate conversation records
        String u1 = currentUserId.compareTo(targetUserId) < 0 ? currentUserId : targetUserId;
        String u2 = currentUserId.compareTo(targetUserId) < 0 ? targetUserId : currentUserId;

        String selectSql = "SELECT id, user1_id, user2_id, created_at, updated_at FROM conversations WHERE user1_id = ? AND user2_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(selectSql)) {
            ps.setString(1, u1);
            ps.setString(2, u2);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Conversation c = new Conversation();
                    c.setId(rs.getString("id"));
                    c.setUser1Id(rs.getString("user1_id"));
                    c.setUser2Id(rs.getString("user2_id"));
                    c.setCreatedAt(rs.getTimestamp("created_at"));
                    c.setUpdatedAt(rs.getTimestamp("updated_at"));
                    return c;
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error searching conversation between " + u1 + " and " + u2, e);
        }

        // Create new conversation
        String id = UUID.randomUUID().toString();
        Timestamp now = new Timestamp(System.currentTimeMillis());
        String insertSql = "INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(insertSql)) {
            ps.setString(1, id);
            ps.setString(2, u1);
            ps.setString(3, u2);
            ps.setTimestamp(4, now);
            ps.setTimestamp(5, now);
            ps.executeUpdate();

            Conversation c = new Conversation();
            c.setId(id);
            c.setUser1Id(u1);
            c.setUser2Id(u2);
            c.setCreatedAt(now);
            c.setUpdatedAt(now);
            return c;
        } catch (SQLException e) {
            // In case of concurrency, try fetch again
            return getOrCreateConversation(currentUserId, targetUserId);
        }
    }

    public List<Conversation> findConversationsForUser(String userId) {
        List<Conversation> list = new ArrayList<>();
        String sql = """
            SELECT 
                c.id, c.user1_id, c.user2_id, c.created_at, c.updated_at,
                u.id AS other_id, u.username AS other_username, u.display_username AS other_display,
                (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_msg,
                (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_msg_at
            FROM conversations c
            JOIN users u ON (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END) = u.id
            WHERE c.user1_id = ? OR c.user2_id = ?
            ORDER BY c.updated_at DESC
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, userId);
            ps.setString(2, userId);
            ps.setString(3, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Conversation c = new Conversation();
                    c.setId(rs.getString("id"));
                    c.setUser1Id(rs.getString("user1_id"));
                    c.setUser2Id(rs.getString("user2_id"));
                    c.setOtherUserId(rs.getString("other_id"));
                    c.setOtherUsername(rs.getString("other_username"));
                    c.setOtherDisplayName(rs.getString("other_display"));
                    c.setLastMessage(rs.getString("last_msg"));
                    c.setLastMessageAt(rs.getTimestamp("last_msg_at"));
                    c.setCreatedAt(rs.getTimestamp("created_at"));
                    c.setUpdatedAt(rs.getTimestamp("updated_at"));
                    list.add(c);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error loading conversations for user: " + userId, e);
        }
        return list;
    }

    public boolean createMessage(ChatMessage msg) {
        String insertMsgSql = "INSERT INTO messages (id, conversation_id, sender_id, content, message_type, created_at) VALUES (?, ?, ?, ?, ?, ?)";
        String updateConvSql = "UPDATE conversations SET updated_at = ? WHERE id = ?";
        try (Connection conn = DatabaseConfig.getConnection()) {
            conn.setAutoCommit(false); // Advanced Java Transaction boundary
            try (PreparedStatement psMsg = conn.prepareStatement(insertMsgSql);
                 PreparedStatement psConv = conn.prepareStatement(updateConvSql)) {
                
                psMsg.setString(1, msg.getId());
                psMsg.setString(2, msg.getConversationId());
                psMsg.setString(3, msg.getSenderId());
                psMsg.setString(4, msg.getContent());
                psMsg.setString(5, msg.getMessageType() != null ? msg.getMessageType() : "text");
                psMsg.setTimestamp(6, msg.getCreatedAt());
                psMsg.executeUpdate();

                psConv.setTimestamp(1, msg.getCreatedAt());
                psConv.setString(2, msg.getConversationId());
                psConv.executeUpdate();

                conn.commit();
                return true;
            } catch (SQLException ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error sending message", e);
        }
    }

    public List<ChatMessage> findMessages(String conversationId, int limit) {
        List<ChatMessage> list = new ArrayList<>();
        String sql = """
            SELECT m.id, m.conversation_id, m.sender_id, u.username, m.content, m.message_type, m.created_at
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at ASC
            LIMIT ?
        """;
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, conversationId);
            ps.setInt(2, limit > 0 ? limit : 50);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    ChatMessage msg = new ChatMessage();
                    msg.setId(rs.getString("id"));
                    msg.setConversationId(rs.getString("conversation_id"));
                    msg.setSenderId(rs.getString("sender_id"));
                    msg.setSenderUsername(rs.getString("username"));
                    msg.setContent(rs.getString("content"));
                    msg.setMessageType(rs.getString("message_type"));
                    msg.setCreatedAt(rs.getTimestamp("created_at"));
                    list.add(msg);
                }
            }
        } catch (SQLException e) {
            throw new RuntimeException("Error loading chat messages for conversation: " + conversationId, e);
        }
        return list;
    }

    public boolean isItemSharedWithUser(String itemId, String userId) {
        String sql = "SELECT COUNT(*) FROM item_shares WHERE item_id = ? AND shared_with_user_id = ?";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, itemId);
            ps.setString(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (SQLException e) {
            return false;
        }
    }

    public boolean shareItem(String itemId, String sharedByUserId, String sharedWithUserId) {
        // Prevent duplicate share entries
        if (isItemSharedWithUser(itemId, sharedWithUserId)) {
            return true;
        }
        String sql = "INSERT INTO item_shares (id, item_id, shared_by_user_id, shared_with_user_id, created_at) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, UUID.randomUUID().toString());
            ps.setString(2, itemId);
            ps.setString(3, sharedByUserId);
            ps.setString(4, sharedWithUserId);
            ps.setTimestamp(5, new Timestamp(System.currentTimeMillis()));
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ChatDAO] Error creating item share: " + e.getMessage());
            return false;
        }
    }

    public boolean isBlocked(String user1Id, String user2Id) {
        String sql = "SELECT COUNT(*) FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)";
        try (Connection conn = DatabaseConfig.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, user1Id);
            ps.setString(2, user2Id);
            ps.setString(3, user2Id);
            ps.setString(4, user1Id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        } catch (SQLException e) {
            return false;
        }
    }
}
