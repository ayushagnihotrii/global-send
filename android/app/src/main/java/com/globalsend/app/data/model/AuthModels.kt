package com.globalsend.app.data.model

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("username") val username: String,
    @SerializedName("displayUsername") val displayUsername: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("lastLoginAt") val lastLoginAt: String? = null,
    @SerializedName("storageLimitBytes") val storageLimitBytes: Long = 2147483648L,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("avatarSizeBytes") val avatarSizeBytes: Long? = null,
    @SerializedName("isAdmin") val isAdmin: Boolean? = false,
    @SerializedName("hasSecurityQuestion") val hasSecurityQuestion: Boolean = false,
    @SerializedName("securityQuestionUpdatedAt") val securityQuestionUpdatedAt: String? = null,
    @SerializedName("keyResetAt") val keyResetAt: String? = null
)

data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("key") val key: String,
    @SerializedName("rememberMe") val rememberMe: Boolean = true
)

data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("keyResetNotice") val keyResetNotice: String? = null,
    @SerializedName("needsSecurityQuestion") val needsSecurityQuestion: Boolean = false
)

data class RegisterRequest(
    @SerializedName("username") val username: String,
    @SerializedName("key") val key: String,
    @SerializedName("securityQuestion") val securityQuestion: String? = null,
    @SerializedName("securityAnswer") val securityAnswer: String? = null
)

data class RegisterResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("recoveryCode") val recoveryCode: String? = null,
    @SerializedName("error") val error: String? = null
)

data class RecoveryQuestionResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("question") val question: String? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("lockoutRemainingSeconds") val lockoutRemainingSeconds: Long? = null
)

data class ResetKeyRequest(
    @SerializedName("username") val username: String,
    @SerializedName("securityAnswer") val securityAnswer: String,
    @SerializedName("newKey") val newKey: String
)

data class ResetKeyResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)

data class SecurityQuestionSetupRequest(
    @SerializedName("question") val question: String,
    @SerializedName("answer") val answer: String
)

data class GenericResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null
)
