package com.globalsend.app.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Register : Screen("register")
    object Recovery : Screen("recovery")
    object Main : Screen("main")
    object ItemDetail : Screen("item_detail/{itemId}") {
        fun createRoute(itemId: String) = "item_detail/$itemId"
    }
    object ChatConversation : Screen("chat/{conversationId}/{peerUsername}") {
        fun createRoute(conversationId: String, peerUsername: String) = "chat/$conversationId/$peerUsername"
    }
    object Trash : Screen("trash")
}

sealed class BottomNavTab(val route: String, val title: String) {
    object Vault : BottomNavTab("vault", "Vault")
    object Chats : BottomNavTab("chats", "Chats")
    object Settings : BottomNavTab("settings", "Settings")
}
