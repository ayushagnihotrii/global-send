package com.globalsend.app.data.model

import com.google.gson.annotations.SerializedName

data class PublicUserProfileDto(
    @SerializedName("username") val username: String,
    @SerializedName("avatarUrl") val avatarUrl: String? = null
)

data class SharedAttachmentDto(
    @SerializedName("itemId") val itemId: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("type") val type: String,
    @SerializedName("textContent") val textContent: String? = null,
    @SerializedName("url") val url: String? = null,
    @SerializedName("filename") val filename: String? = null,
    @SerializedName("mimeType") val mimeType: String? = null,
    @SerializedName("fileSize") val fileSize: Long? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("isExpired") val isExpired: Boolean = false,
    @SerializedName("isDeleted") val isDeleted: Boolean = false,
    @SerializedName("isAvailable") val isAvailable: Boolean = true,
    @SerializedName("downloadUrl") val downloadUrl: String? = null
)

data class ConversationDto(
    @SerializedName("id") val id: String,
    @SerializedName("peer") val peer: PublicUserProfileDto,
    @SerializedName("isBlockedByMe") val isBlockedByMe: Boolean = false,
    @SerializedName("hasBlockedMe") val hasBlockedMe: Boolean = false,
    @SerializedName("lastMessageAt") val lastMessageAt: String,
    @SerializedName("lastMessagePreview") val lastMessagePreview: String? = null,
    @SerializedName("createdAt") val createdAt: String
)

data class ConversationsResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("conversations") val conversations: List<ConversationDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class StartConversationRequest(
    @SerializedName("username") val username: String
)

data class StartConversationResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("conversation") val conversation: ConversationDto? = null,
    @SerializedName("error") val error: String? = null
)

data class ChatMessageDto(
    @SerializedName("id") val id: String,
    @SerializedName("conversationId") val conversationId: String,
    @SerializedName("senderUsername") val senderUsername: String,
    @SerializedName("isOwnMessage") val isOwnMessage: Boolean,
    @SerializedName("messageType") val messageType: String,
    @SerializedName("textContent") val textContent: String? = null,
    @SerializedName("attachment") val attachment: SharedAttachmentDto? = null,
    @SerializedName("createdAt") val createdAt: String
)

data class ConversationMessagesResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("conversation") val conversation: ConversationDto? = null,
    @SerializedName("messages") val messages: List<ChatMessageDto> = emptyList(),
    @SerializedName("error") val error: String? = null
)

data class SendMessageRequest(
    @SerializedName("messageType") val messageType: String = "text",
    @SerializedName("textContent") val textContent: String? = null,
    @SerializedName("itemId") val itemId: String? = null
)

data class SendMessageResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: ChatMessageDto? = null,
    @SerializedName("error") val error: String? = null
)

data class BlockUserRequest(
    @SerializedName("username") val username: String,
    @SerializedName("block") val block: Boolean
)
