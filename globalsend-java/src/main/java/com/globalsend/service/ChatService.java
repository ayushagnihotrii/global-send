package com.globalsend.service;

import com.globalsend.dao.ChatDAO;
import com.globalsend.dao.UserDAO;
import com.globalsend.dao.VaultItemDAO;
import com.globalsend.model.ChatMessage;
import com.globalsend.model.Conversation;
import com.globalsend.model.User;
import com.globalsend.model.VaultItem;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public class ChatService {

    private final ChatDAO chatDAO;
    private final UserDAO userDAO;
    private final VaultItemDAO itemDAO;

    public ChatService() {
        this.chatDAO = new ChatDAO();
        this.userDAO = new UserDAO();
        this.itemDAO = new VaultItemDAO();
    }

    public List<Conversation> getUserConversations(String userId) {
        return chatDAO.findConversationsForUser(userId);
    }

    public Conversation openConversationWithUsername(String currentUserId, String targetUsername) {
        Optional<User> targetOpt = userDAO.findByUsername(targetUsername.trim());
        if (targetOpt.isEmpty()) {
            throw new IllegalArgumentException("User '" + targetUsername + "' not found");
        }

        User target = targetOpt.get();
        if (target.getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot start conversation with yourself");
        }

        Conversation conv = chatDAO.getOrCreateConversation(currentUserId, target.getId());
        conv.setOtherUserId(target.getId());
        conv.setOtherUsername(target.getUsername());
        conv.setOtherDisplayName(target.getDisplayUsername());
        return conv;
    }

    public ChatMessage sendMessage(String conversationId, String senderId, String text) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Message content cannot be blank");
        }

        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setConversationId(conversationId);
        msg.setSenderId(senderId);
        msg.setContent(text.trim());
        msg.setMessageType("text");
        msg.setCreatedAt(new Timestamp(System.currentTimeMillis()));

        chatDAO.createMessage(msg);
        return msg;
    }

    public ChatMessage shareItemInConversation(String conversationId, String senderId, String otherUserId, String itemId) {
        Optional<VaultItem> itemOpt = itemDAO.findById(itemId);
        if (itemOpt.isEmpty() || !itemOpt.get().getUserId().equals(senderId)) {
            throw new IllegalArgumentException("Vault item not found or unauthorized");
        }

        VaultItem item = itemOpt.get();

        // Register permission in item_shares table
        chatDAO.shareItem(itemId, senderId, otherUserId);

        // Send item share card message
        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setConversationId(conversationId);
        msg.setSenderId(senderId);
        msg.setContent(itemId);
        msg.setMessageType("item_share");
        msg.setCreatedAt(new Timestamp(System.currentTimeMillis()));
        msg.setSharedItem(item);

        chatDAO.createMessage(msg);
        return msg;
    }

    public List<ChatMessage> getConversationMessages(String conversationId, int limit) {
        List<ChatMessage> messages = chatDAO.findMessages(conversationId, limit);
        // Enrich any shared item cards
        for (ChatMessage msg : messages) {
            if ("item_share".equalsIgnoreCase(msg.getMessageType()) && msg.getContent() != null) {
                itemDAO.findById(msg.getContent()).ifPresent(msg::setSharedItem);
            }
        }
        return messages;
    }

    public List<User> searchUsers(String query, String currentUserId) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        return userDAO.searchUsers(query.trim(), currentUserId);
    }
}
