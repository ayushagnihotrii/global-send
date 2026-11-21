package com.globalsend.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.globalsend.app.data.model.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SessionManager(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            "globalsend_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    } catch (e: Exception) {
        context.getSharedPreferences("globalsend_prefs_fallback", Context.MODE_PRIVATE)
    }

    private val _tokenFlow = MutableStateFlow(getAuthToken())
    val tokenFlow: StateFlow<String?> = _tokenFlow.asStateFlow()

    companion object {
        private const val KEY_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USERNAME = "username"
        private const val KEY_AVATAR_URL = "avatar_url"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val KEY_THEME_MODE = "theme_mode"

        const val DEFAULT_SERVER_URL = "https://global-send-v2.vercel.app"
    }

    fun saveAuth(token: String, user: UserDto) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putString(KEY_USER_ID, user.id)
            .putString(KEY_USERNAME, user.username)
            .putString(KEY_AVATAR_URL, user.avatarUrl)
            .apply()
        _tokenFlow.value = token
    }

    fun clearAuth() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_USER_ID)
            .remove(KEY_USERNAME)
            .remove(KEY_AVATAR_URL)
            .apply()
        _tokenFlow.value = null
    }

    fun getAuthToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun isLoggedIn(): Boolean = !getAuthToken().isNullOrBlank()

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getUsername(): String? = prefs.getString(KEY_USERNAME, null)

    fun getAvatarUrl(): String? = prefs.getString(KEY_AVATAR_URL, null)

    fun getServerUrl(): String {
        return prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
    }

    fun setServerUrl(url: String) {
        var cleanUrl = url.trim()
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            cleanUrl = "http://$cleanUrl"
        }
        if (cleanUrl.endsWith("/")) {
            cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1)
        }
        prefs.edit().putString(KEY_SERVER_URL, cleanUrl).apply()
    }

    fun isBiometricEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun setBiometricEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    }

    fun getThemeMode(): String = prefs.getString(KEY_THEME_MODE, "dark") ?: "dark"

    fun setThemeMode(mode: String) {
        prefs.edit().putString(KEY_THEME_MODE, mode).apply()
    }
}
