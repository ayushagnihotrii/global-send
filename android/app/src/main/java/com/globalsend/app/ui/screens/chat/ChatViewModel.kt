package com.globalsend.app.ui.screens.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.ChatMessageDto
import com.globalsend.app.data.model.ConversationDto
import com.globalsend.app.data.repository.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ChatViewModel(
    private val chatRepository: ChatRepository = GlobalSendApp.instance.chatRepository
) : ViewModel() {

    val conversations: StateFlow<List<ConversationDto>> = chatRepository.conversations
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _messages = MutableStateFlow<List<ChatMessageDto>>(emptyList())
    val messages: StateFlow<List<ChatMessageDto>> = _messages.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    init {
        refreshConversations()
    }

    fun refreshConversations() {
        viewModelScope.launch {
            _isRefreshing.value = true
            chatRepository.refreshConversations()
            _isRefreshing.value = false
        }
    }

    fun startNewConversation(username: String, onSuccess: (ConversationDto) -> Unit) {
        if (username.isBlank()) return
        viewModelScope.launch {
            val result = chatRepository.startConversation(username.trim())
            result.onSuccess { conv ->
                onSuccess(conv)
            }.onFailure { ex ->
                _toastMessage.value = ex.localizedMessage ?: "Failed to start chat"
            }
        }
    }

    fun loadMessages(conversationId: String) {
        viewModelScope.launch {
            val result = chatRepository.getMessages(conversationId)
            result.onSuccess {
                _messages.value = it
            }.onFailure { ex ->
                _toastMessage.value = ex.localizedMessage ?: "Failed to load messages"
            }
        }
    }

    fun sendMessage(conversationId: String, text: String) {
        if (text.isBlank()) return
        viewModelScope.launch {
            val result = chatRepository.sendTextMessage(conversationId, text.trim())
            result.onSuccess { newMsg ->
                _messages.value = _messages.value + newMsg
            }.onFailure { ex ->
                _toastMessage.value = ex.localizedMessage ?: "Failed to send message"
            }
        }
    }

    fun blockUser(username: String, block: Boolean) {
        viewModelScope.launch {
            chatRepository.blockUser(username, block)
            _toastMessage.value = if (block) "User blocked" else "User unblocked"
        }
    }

    fun clearToast() {
        _toastMessage.value = null
    }
}
