package com.globalsend.app

import android.app.Application
import com.globalsend.app.data.api.ApiClient
import com.globalsend.app.data.local.GlobalSendDatabase
import com.globalsend.app.data.local.SessionManager
import com.globalsend.app.data.repository.AuthRepository
import com.globalsend.app.data.repository.ChatRepository
import com.globalsend.app.data.repository.VaultRepository

class GlobalSendApp : Application() {

    lateinit var sessionManager: SessionManager
        private set
    lateinit var apiClient: ApiClient
        private set
    lateinit var database: GlobalSendDatabase
        private set
    lateinit var authRepository: AuthRepository
        private set
    lateinit var vaultRepository: VaultRepository
        private set
    lateinit var chatRepository: ChatRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        sessionManager = SessionManager(this)
        apiClient = ApiClient(sessionManager)
        database = GlobalSendDatabase.getDatabase(this)

        authRepository = AuthRepository(apiClient, sessionManager)
        vaultRepository = VaultRepository(apiClient, database.itemDao())
        chatRepository = ChatRepository(apiClient, database.chatDao())
    }

    companion object {
        lateinit var instance: GlobalSendApp
            private set
    }
}
