package com.globalsend.app.data.repository

import com.globalsend.app.data.api.ApiClient
import com.globalsend.app.data.local.SessionManager
import com.globalsend.app.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository(
    private val apiClient: ApiClient,
    private val sessionManager: SessionManager
) {
    suspend fun login(username: String, key: String): Result<LoginResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().login(LoginRequest(username = username, key = key))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.token != null && body.user != null) {
                    sessionManager.saveAuth(body.token, body.user)
                }
                Result.success(body)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Login failed"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(
        username: String,
        key: String,
        securityQuestion: String?,
        securityAnswer: String?
    ): Result<RegisterResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().register(
                RegisterRequest(
                    username = username,
                    key = key,
                    securityQuestion = securityQuestion,
                    securityAnswer = securityAnswer
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success && body.token != null && body.user != null) {
                    sessionManager.saveAuth(body.token, body.user)
                }
                Result.success(body)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Registration failed"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getRecoveryQuestion(username: String): Result<RecoveryQuestionResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().getRecoveryQuestion(username)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Failed to retrieve recovery question"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resetKey(
        username: String,
        securityAnswer: String,
        newKey: String
    ): Result<ResetKeyResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().resetKey(
                ResetKeyRequest(
                    username = username,
                    securityAnswer = securityAnswer,
                    newKey = newKey
                )
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Key reset failed"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setupSecurityQuestion(question: String, answer: String): Result<GenericResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getService().setupSecurityQuestion(
                SecurityQuestionSetupRequest(question = question, answer = answer)
            )
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Failed to set security question"
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            apiClient.getService().logout()
        } catch (ignored: Exception) {
        } finally {
            sessionManager.clearAuth()
        }
        Result.success(Unit)
    }

    fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()
    fun getUsername(): String? = sessionManager.getUsername()
    fun getServerUrl(): String = sessionManager.getServerUrl()
    fun setServerUrl(url: String) = sessionManager.setServerUrl(url)
}
