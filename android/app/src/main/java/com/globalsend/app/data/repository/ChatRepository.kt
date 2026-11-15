package com.globalsend.app.data.repository

import com.globalsend.app.data.api.ApiClient
import com.globalsend.app.data.local.dao.ChatDao
import com.globalsend.app.data.local.entity.ChatMessageEntity
import com.globalsend.app.data.local.entity.ConversationEntity
import com.globalsend.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

class ChatRepository(
    private val apiClient: ApiClient,
    private val chatDao: ChatDao
) {
    val conversations: Flow<List<ConversationDto>> = chatDao.getAllConversations().map { list ->
        list.map { it.toDto() }
    }

    suspend fun refreshConversations(): Result<List<ConversationDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().getConversations()
            if (response.isSuccessful && response.body() != null) {
                val convs = response.body()!!.conversations
                val entities = convs.map { ConversationEntity.fromDto(it) }
                chatDao.insertConversations(entities)
                Result.success(convs)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to load chats"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun startConversation(targetUsername: String): Result<ConversationDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().startConversation(
                StartConversationRequest(username = targetUsername)
            )
            if (response.isSuccessful && response.body()?.conversation != null) {
                val conv = response.body()!!.conversation!!
                chatDao.insertConversations(listOf(ConversationEntity.fromDto(conv)))
                Result.success(conv)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to start chat with $targetUsername"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMessages(conversationId: String): Result<List<ChatMessageDto>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().getConversationMessages(conversationId)
            if (response.isSuccessful && response.body() != null) {
                val msgs = response.body()!!.messages
                val entities = msgs.map {
                    ChatMessageEntity(
                        id = it.id,
                        conversationId = it.conversationId,
                        senderUsername = it.senderUsername,
                        isOwnMessage = it.isOwnMessage,
                        messageType = it.messageType,
                        textContent = it.textContent,
                        attachmentJson = null,
                        createdAt = it.createdAt
                    )
                }
                chatDao.insertMessages(entities)
                Result.success(msgs)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to load messages"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendTextMessage(conversationId: String, text: String): Result<ChatMessageDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().sendMessage(
                id = conversationId,
                request = SendMessageRequest(messageType = "text", textContent = text)
            )
            if (response.isSuccessful && response.body()?.message != null) {
                val msg = response.body()!!.message!!
                chatDao.insertMessage(
                    ChatMessageEntity(
                        id = msg.id,
                        conversationId = msg.conversationId,
                        senderUsername = msg.senderUsername,
                        isOwnMessage = true,
                        messageType = msg.messageType,
                        textContent = msg.textContent,
                        attachmentJson = null,
                        createdAt = msg.createdAt
                    )
                )
                Result.success(msg)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to send message"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendAttachment(conversationId: String, itemId: String): Result<ChatMessageDto> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().sendMessage(
                id = conversationId,
                request = SendMessageRequest(messageType = "attachment", itemId = itemId)
            )
            if (response.isSuccessful && response.body()?.message != null) {
                Result.success(response.body()!!.message!!)
            } else {
                val err = response.errorBody()?.string() ?: "Failed to share item"
                Result.failure(Exception(err))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun blockUser(username: String, block: Boolean): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().blockUser(BlockUserRequest(username = username, block = block))
            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to update block state"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteConversation(id: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().deleteConversation(id)
            if (response.isSuccessful) {
                chatDao.deleteConversation(id)
                chatDao.deleteMessagesForConversation(id)
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete chat"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
