package com.globalsend.app.ui.screens.settings

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.StorageUsageDto
import com.globalsend.app.data.repository.AuthRepository
import com.globalsend.app.data.repository.VaultRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val authRepository: AuthRepository = GlobalSendApp.instance.authRepository,
    private val vaultRepository: VaultRepository = GlobalSendApp.instance.vaultRepository
) : ViewModel() {

    private val sessionManager = GlobalSendApp.instance.sessionManager

    private val _storageUsage = MutableStateFlow<StorageUsageDto?>(null)
    val storageUsage: StateFlow<StorageUsageDto?> = _storageUsage.asStateFlow()

    private val _serverUrl = MutableStateFlow(sessionManager.getServerUrl())
    val serverUrl: StateFlow<String> = _serverUrl.asStateFlow()

    private val _isBiometricEnabled = MutableStateFlow(sessionManager.isBiometricEnabled())
    val isBiometricEnabled: StateFlow<Boolean> = _isBiometricEnabled.asStateFlow()

    private val _themeMode = MutableStateFlow(sessionManager.getThemeMode())
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    init {
        loadStorage()
    }

    fun loadStorage() {
        viewModelScope.launch {
            val result = vaultRepository.getStorageUsage()
            result.onSuccess {
                _storageUsage.value = it
            }
        }
    }

    fun setServerUrl(url: String) {
        sessionManager.setServerUrl(url)
        _serverUrl.value = sessionManager.getServerUrl()
        _toastMessage.value = "Server updated"
    }

    fun setBiometricEnabled(enabled: Boolean) {
        sessionManager.setBiometricEnabled(enabled)
        _isBiometricEnabled.value = enabled
        _toastMessage.value = if (enabled) "Biometric lock enabled" else "Biometric lock disabled"
    }

    fun setThemeMode(mode: String) {
        sessionManager.setThemeMode(mode)
        _themeMode.value = mode
        _toastMessage.value = "Theme updated: $mode"
    }

    fun exportVault(context: Context) {
        viewModelScope.launch {
            val result = vaultRepository.exportVault()
            result.onSuccess { jsonContent ->
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, jsonContent)
                    type = "application/json"
                }
                val shareIntent = Intent.createChooser(sendIntent, "Export Global Send Vault")
                context.startActivity(shareIntent)
            }.onFailure { ex ->
                _toastMessage.value = ex.localizedMessage ?: "Failed to export vault"
            }
        }
    }

    fun logout(onSuccess: () -> Unit) {
        viewModelScope.launch {
            authRepository.logout()
            onSuccess()
        }
    }

    fun clearToast() {
        _toastMessage.value = null
    }
}
