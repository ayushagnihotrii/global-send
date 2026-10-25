package com.globalsend.model;

import java.io.Serializable;
import java.sql.Timestamp;

public class Conversation implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String user1Id;
    private String user2Id;
    private String otherUserId;
    private String otherUsername;
    private String otherDisplayName;
    private String lastMessage;
    private Timestamp lastMessageAt;
    private Timestamp createdAt;
    private Timestamp updatedAt;

    public Conversation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUser1Id() { return user1Id; }
    public void setUser1Id(String user1Id) { this.user1Id = user1Id; }

    public String getUser2Id() { return user2Id; }
    public void setUser2Id(String user2Id) { this.user2Id = user2Id; }

    public String getOtherUserId() { return otherUserId; }
    public void setOtherUserId(String otherUserId) { this.otherUserId = otherUserId; }

    public String getOtherUsername() { return otherUsername; }
    public void setOtherUsername(String otherUsername) { this.otherUsername = otherUsername; }

    public String getOtherDisplayName() { return otherDisplayName; }
    public void setOtherDisplayName(String otherDisplayName) { this.otherDisplayName = otherDisplayName; }

    public String getLastMessage() { return lastMessage; }
    public void setLastMessage(String lastMessage) { this.lastMessage = lastMessage; }

    public Timestamp getLastMessageAt() { return lastMessageAt; }
    public void setLastMessageAt(Timestamp lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
