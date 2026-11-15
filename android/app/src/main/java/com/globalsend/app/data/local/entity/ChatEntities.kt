package com.globalsend.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.globalsend.app.data.model.ConversationDto
import com.globalsend.app.data.model.PublicUserProfileDto

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
    val peerUsername: String,
    val peerAvatarUrl: String?,
    val isBlockedByMe: Boolean,
    val hasBlockedMe: Boolean,
    val lastMessageAt: String,
    val lastMessagePreview: String?,
    val createdAt: String
) {
    fun toDto(): ConversationDto {
        return ConversationDto(
            id = id,
            peer = PublicUserProfileDto(
                username = peerUsername,
                avatarUrl = peerAvatarUrl
            ),
            isBlockedByMe = isBlockedByMe,
            hasBlockedMe = hasBlockedMe,
            lastMessageAt = lastMessageAt,
            lastMessagePreview = lastMessagePreview,
            createdAt = createdAt
        )
    }

    companion object {
        fun fromDto(dto: ConversationDto): ConversationEntity {
            return ConversationEntity(
                id = dto.id,
                peerUsername = dto.peer.username,
                peerAvatarUrl = dto.peer.avatarUrl,
                isBlockedByMe = dto.isBlockedByMe,
                hasBlockedMe = dto.hasBlockedMe,
                lastMessageAt = dto.lastMessageAt,
                lastMessagePreview = dto.lastMessagePreview,
                createdAt = dto.createdAt
            )
        }
    }
}

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderUsername: String,
    val isOwnMessage: Boolean,
    val messageType: String,
    val textContent: String?,
    val attachmentJson: String?,
    val createdAt: String
)
