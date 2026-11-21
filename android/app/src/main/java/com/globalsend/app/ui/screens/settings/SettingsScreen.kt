package com.globalsend.app.ui.screens.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.GlobalSendTextField
import com.globalsend.app.ui.components.GlobalSendTopBar
import com.globalsend.app.ui.theme.CardShape
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.PillShape
import kotlinx.coroutines.delay

@Composable
fun SettingsScreen(
    onNavigateToTrash: () -> Unit,
    onLogout: () -> Unit,
    viewModel: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val colors = GlobalSendThemeTokens.colors
    val app = GlobalSendApp.instance

    val username = app.sessionManager.getUsername() ?: "User"
    val storageUsage by viewModel.storageUsage.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()
    val isBiometricEnabled by viewModel.isBiometricEnabled.collectAsState()
    val toastMessage by viewModel.toastMessage.collectAsState()

    var showServerDialog by remember { mutableStateOf(false) }
    var tempServerUrl by remember { mutableStateOf(serverUrl) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    LaunchedEffect(toastMessage) {
        if (toastMessage != null) {
            delay(2500)
            viewModel.clearToast()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgMain)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            GlobalSendTopBar(title = "Settings")

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 100.dp)
            ) {
                // Profile Banner
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.surfaceElevated)
                        .padding(18.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(50.dp)
                                .clip(CircleShape)
                                .background(colors.accent),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = username.take(2).uppercase(),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column {
                            Text(
                                text = "@$username",
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Zero-Knowledge Personal Locker",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.textSecondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Storage Meter Card
                Text(
                    text = "STORAGE & QUOTA",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
                )

                val usedBytes = storageUsage?.usedBytes ?: 0L
                val limitBytes = storageUsage?.limitBytes ?: (2L * 1024 * 1024 * 1024)
                val usedMb = usedBytes / (1024 * 1024)
                val limitMb = limitBytes / (1024 * 1024)
                val progress = if (limitBytes > 0) (usedBytes.toFloat() / limitBytes.toFloat()).coerceIn(0f, 1f) else 0f

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.surfaceElevated)
                        .padding(16.dp)
                ) {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "$usedMb MB used",
                                style = MaterialTheme.typography.titleMedium,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "$limitMb MB total",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.textSecondary
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(PillShape),
                            color = colors.accent,
                            trackColor = colors.surfaceSecondary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Vault Management Options
                Text(
                    text = "DATA MANAGEMENT",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.surfaceElevated)
                ) {
                    SettingsRow(
                        icon = Icons.Default.DeleteOutline,
                        title = "Trash & Soft Deleted Items",
                        subtitle = "Restore or permanently wipe items",
                        onClick = onNavigateToTrash
                    )

                    HorizontalDivider(color = colors.borderSubtle, thickness = 0.5.dp)

                    SettingsRow(
                        icon = Icons.Default.FileDownload,
                        title = "Export Vault Data",
                        subtitle = "Download all items as JSON",
                        onClick = { viewModel.exportVault(context) }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Appearance & Theme Card
                Text(
                    text = "APPEARANCE & THEME",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
                )

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.surfaceElevated)
                        .padding(16.dp)
                ) {
                    Column {
                        Text(
                            text = "Color Theme",
                            style = MaterialTheme.typography.bodyLarge,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "Choose light, dark, or follow device system settings",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        val currentTheme by viewModel.themeMode.collectAsState()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(PillShape)
                                .background(colors.surfaceSecondary)
                                .padding(4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            listOf(
                                "dark" to "Dark",
                                "light" to "Light",
                                "system" to "System"
                            ).forEach { (mode, label) ->
                                val isSelected = currentTheme == mode
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(PillShape)
                                        .clickable { viewModel.setThemeMode(mode) }
                                        .background(if (isSelected) colors.accent else Color.Transparent)
                                        .padding(vertical = 10.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = label,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = if (isSelected) (if (colors.isDark) Color(0xFF111111) else Color.White) else colors.textSecondary,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Security & System Settings
                Text(
                    text = "SECURITY & INSTANCE",
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.textSecondary,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 4.dp, bottom = 8.dp)
                )

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(CardShape)
                        .background(colors.surfaceElevated)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Fingerprint, contentDescription = null, tint = colors.accent)
                            Spacer(modifier = Modifier.width(14.dp))
                            Column {
                                Text(
                                    text = "Biometric Lock",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = colors.textPrimary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = "Require fingerprint/face to unlock app",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.textSecondary
                                )
                            }
                        }

                        Switch(
                            checked = isBiometricEnabled,
                            onCheckedChange = { viewModel.setBiometricEnabled(it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = colors.accent
                            )
                        )
                    }

                    HorizontalDivider(color = colors.borderSubtle, thickness = 0.5.dp)

                    SettingsRow(
                        icon = Icons.Default.Dns,
                        title = "Backend Server URL",
                        subtitle = serverUrl,
                        onClick = {
                            tempServerUrl = serverUrl
                            showServerDialog = true
                        }
                    )
                }

                Spacer(modifier = Modifier.height(30.dp))

                // Log Out Button
                Button(
                    onClick = { showLogoutDialog = true },
                    shape = PillShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = colors.surfaceElevated,
                        contentColor = colors.destructive
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Logout, contentDescription = null, tint = colors.destructive)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Log Out of Locker",
                            style = MaterialTheme.typography.labelLarge,
                            color = colors.destructive
                        )
                    }
                }
            }
        }

        // Server URL Edit Dialog
        if (showServerDialog) {
            AlertDialog(
                onDismissRequest = { showServerDialog = false },
                title = { Text("Server Instance URL", color = colors.textPrimary) },
                text = {
                    Column {
                        Text(
                            text = "Set the active backend server address.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        GlobalSendTextField(
                            value = tempServerUrl,
                            onValueChange = { tempServerUrl = it },
                            placeholder = "http://10.0.2.2:3000"
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        viewModel.setServerUrl(tempServerUrl)
                        showServerDialog = false
                    }) {
                        Text("Save", color = colors.accent)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showServerDialog = false }) {
                        Text("Cancel", color = colors.textSecondary)
                    }
                },
                containerColor = colors.surfaceElevated
            )
        }

        // Logout Confirmation Dialog
        if (showLogoutDialog) {
            AlertDialog(
                onDismissRequest = { showLogoutDialog = false },
                title = { Text("Log Out?", color = colors.textPrimary) },
                text = {
                    Text(
                        "Are you sure you want to log out? Your session token will be cleared from this device.",
                        color = colors.textSecondary
                    )
                },
                confirmButton = {
                    TextButton(onClick = {
                        showLogoutDialog = false
                        viewModel.logout(onLogout)
                    }) {
                        Text("Log Out", color = colors.destructive)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutDialog = false }) {
                        Text("Cancel", color = colors.textSecondary)
                    }
                },
                containerColor = colors.surfaceElevated
            )
        }

        // Pill Toast
        FloatingPillToast(
            message = toastMessage,
            visible = toastMessage != null,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
fun SettingsRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    val colors = GlobalSendThemeTokens.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = colors.accent)
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = colors.textPrimary,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = colors.textSecondary
            )
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = colors.textTertiary)
    }
}
