package com.globalsend.app.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.UserDto
import com.globalsend.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class Success(val user: UserDto, val needsSecurityQuestion: Boolean = false) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

sealed class RecoveryUiState {
    object Idle : RecoveryUiState()
    object LoadingQuestion : RecoveryUiState()
    data class QuestionLoaded(val question: String) : RecoveryUiState()
    object ResetSuccess : RecoveryUiState()
    data class Error(val message: String) : RecoveryUiState()
}

class AuthViewModel(
    private val authRepository: AuthRepository = GlobalSendApp.instance.authRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val authState: StateFlow<AuthUiState> = _authState.asStateFlow()

    private val _recoveryState = MutableStateFlow<RecoveryUiState>(RecoveryUiState.Idle)
    val recoveryState: StateFlow<RecoveryUiState> = _recoveryState.asStateFlow()

    private val _serverUrl = MutableStateFlow(authRepository.getServerUrl())
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    fun updateServerUrl(url: String) {
        authRepository.setServerUrl(url)
        _serverUrl.value = authRepository.getServerUrl()
    }

    fun login(username: String, key: String) {
        if (username.isBlank() || key.isBlank()) {
            _authState.value = AuthUiState.Error("Username and key are required")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthUiState.Loading
            val result = authRepository.login(username.trim(), key.trim())
            result.onSuccess { response ->
                if (response.user != null) {
                    _authState.value = AuthUiState.Success(
                        user = response.user,
                        needsSecurityQuestion = response.needsSecurityQuestion
                    )
                } else {
                    _authState.value = AuthUiState.Error(response.error ?: "Invalid username or key")
                }
            }.onFailure { ex ->
                _authState.value = AuthUiState.Error(ex.localizedMessage ?: "Connection error")
            }
        }
    }

    fun register(
        username: String,
        key: String,
        securityQuestion: String?,
        securityAnswer: String?
    ) {
        if (username.isBlank() || key.isBlank()) {
            _authState.value = AuthUiState.Error("Username and key are required")
            return
        }

        viewModelScope.launch {
            _authState.value = AuthUiState.Loading
            val result = authRepository.register(
                username = username.trim(),
                key = key.trim(),
                securityQuestion = securityQuestion?.trim(),
                securityAnswer = securityAnswer?.trim()
            )
            result.onSuccess { response ->
                if (response.user != null) {
                    _authState.value = AuthUiState.Success(response.user)
                } else {
                    _authState.value = AuthUiState.Error(response.error ?: "Registration failed")
                }
            }.onFailure { ex ->
                _authState.value = AuthUiState.Error(ex.localizedMessage ?: "Connection error")
            }
        }
    }

    fun fetchRecoveryQuestion(username: String) {
        if (username.isBlank()) {
            _recoveryState.value = RecoveryUiState.Error("Please enter your username")
            return
        }

        viewModelScope.launch {
            _recoveryState.value = RecoveryUiState.LoadingQuestion
            val result = authRepository.getRecoveryQuestion(username.trim())
            result.onSuccess { response ->
                if (!response.question.isNullOrBlank()) {
                    _recoveryState.value = RecoveryUiState.QuestionLoaded(response.question)
                } else {
                    _recoveryState.value = RecoveryUiState.Error(response.error ?: "Could not find account")
                }
            }.onFailure { ex ->
                _recoveryState.value = RecoveryUiState.Error(ex.localizedMessage ?: "Failed to get question")
            }
        }
    }

    fun resetKey(username: String, answer: String, newKey: String) {
        if (answer.isBlank() || newKey.isBlank()) {
            _recoveryState.value = RecoveryUiState.Error("Answer and new key are required")
            return
        }

        viewModelScope.launch {
            _recoveryState.value = RecoveryUiState.LoadingQuestion
            val result = authRepository.resetKey(username.trim(), answer.trim(), newKey.trim())
            result.onSuccess { response ->
                if (response.success) {
                    _recoveryState.value = RecoveryUiState.ResetSuccess
                } else {
                    _recoveryState.value = RecoveryUiState.Error(response.error ?: "Key reset failed")
                }
            }.onFailure { ex ->
                _recoveryState.value = RecoveryUiState.Error(ex.localizedMessage ?: "Failed to reset key")
            }
        }
    }

    fun resetAuthState() {
        _authState.value = AuthUiState.Idle
    }

    fun resetRecoveryState() {
        _recoveryState.value = RecoveryUiState.Idle
    }
}
