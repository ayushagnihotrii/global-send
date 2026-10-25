package com.globalsend.model;

import java.io.Serializable;
import java.sql.Timestamp;

public class ChatMessage implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String conversationId;
    private String senderId;
    private String senderUsername;
    private String content;
    private String messageType; // 'text', 'item_share'
    private Timestamp createdAt;
    private VaultItem sharedItem; // Populated when messageType is 'item_share'

    public ChatMessage() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getSenderId() { return senderId; }
    public void setSenderId(String senderId) { this.senderId = senderId; }

    public String getSenderUsername() { return senderUsername; }
    public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public VaultItem getSharedItem() { return sharedItem; }
    public void setSharedItem(VaultItem sharedItem) { this.sharedItem = sharedItem; }
}
