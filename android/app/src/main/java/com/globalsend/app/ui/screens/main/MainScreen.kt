package com.globalsend.app.ui.screens.main

import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChatBubbleOutline
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.globalsend.app.ui.navigation.BottomNavTab
import com.globalsend.app.ui.screens.chat.ChatListScreen
import com.globalsend.app.ui.screens.settings.SettingsScreen
import com.globalsend.app.ui.screens.vault.VaultScreen
import com.globalsend.app.ui.theme.GlobalSendThemeTokens

@Composable
fun MainScreen(
    onNavigateToDetail: (String) -> Unit,
    onNavigateToConversation: (String, String) -> Unit,
    onNavigateToTrash: () -> Unit,
    onLogout: () -> Unit,
    sharedText: String? = null,
    sharedUri: Uri? = null,
    onClearSharedData: () -> Unit = {}
) {
    val colors = GlobalSendThemeTokens.colors
    var selectedTab by remember { mutableStateOf<BottomNavTab>(BottomNavTab.Vault) }

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = colors.surface,
                contentColor = colors.textPrimary,
                tonalElevation = 0.dp
            ) {
                NavigationBarItem(
                    selected = selectedTab == BottomNavTab.Vault,
                    onClick = { selectedTab = BottomNavTab.Vault },
                    icon = {
                        Icon(
                            if (selectedTab == BottomNavTab.Vault) Icons.Filled.FolderOpen else Icons.Filled.Folder,
                            contentDescription = "Vault"
                        )
                    },
                    label = { Text("Vault") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.accent,
                        selectedTextColor = colors.accent,
                        unselectedIconColor = colors.textSecondary,
                        unselectedTextColor = colors.textSecondary,
                        indicatorColor = colors.surfaceSecondary
                    )
                )

                NavigationBarItem(
                    selected = selectedTab == BottomNavTab.Chats,
                    onClick = { selectedTab = BottomNavTab.Chats },
                    icon = {
                        Icon(
                            if (selectedTab == BottomNavTab.Chats) Icons.Filled.ChatBubbleOutline else Icons.Outlined.ChatBubbleOutline,
                            contentDescription = "Chats"
                        )
                    },
                    label = { Text("Chats") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.accent,
                        selectedTextColor = colors.accent,
                        unselectedIconColor = colors.textSecondary,
                        unselectedTextColor = colors.textSecondary,
                        indicatorColor = colors.surfaceSecondary
                    )
                )

                NavigationBarItem(
                    selected = selectedTab == BottomNavTab.Settings,
                    onClick = { selectedTab = BottomNavTab.Settings },
                    icon = {
                        Icon(
                            if (selectedTab == BottomNavTab.Settings) Icons.Filled.Settings else Icons.Outlined.Settings,
                            contentDescription = "Settings"
                        )
                    },
                    label = { Text("Settings") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = colors.accent,
                        selectedTextColor = colors.accent,
                        unselectedIconColor = colors.textSecondary,
                        unselectedTextColor = colors.textSecondary,
                        indicatorColor = colors.surfaceSecondary
                    )
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(colors.bgMain)
        ) {
            when (selectedTab) {
                BottomNavTab.Vault -> {
                    VaultScreen(
                        onNavigateToDetail = onNavigateToDetail,
                        initialSharedText = sharedText,
                        initialSharedUri = sharedUri,
                        onClearSharedData = onClearSharedData
                    )
                }
                BottomNavTab.Chats -> {
                    ChatListScreen(
                        onNavigateToConversation = onNavigateToConversation
                    )
                }
                BottomNavTab.Settings -> {
                    SettingsScreen(
                        onNavigateToTrash = onNavigateToTrash,
                        onLogout = onLogout
                    )
                }
            }
        }
    }
}
