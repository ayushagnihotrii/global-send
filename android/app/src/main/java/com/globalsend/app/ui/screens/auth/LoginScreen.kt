package com.globalsend.app.ui.screens.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.R
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.GlobalSendTextField
import com.globalsend.app.ui.theme.BadgeCoralBg
import com.globalsend.app.ui.theme.BadgeCoralText
import com.globalsend.app.ui.theme.BadgeLimeBg
import com.globalsend.app.ui.theme.BadgeLimeText
import com.globalsend.app.ui.theme.BadgePurpleBg
import com.globalsend.app.ui.theme.BadgePurpleText
import com.globalsend.app.ui.theme.GlobalSendThemeTokens

@Composable
fun LoginScreen(
    onNavigateToMain: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToRecovery: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val serverUrl by viewModel.serverUrl.collectAsState()

    var username by remember { mutableStateOf("") }
    var key by remember { mutableStateOf("") }
    var showKey by remember { mutableStateOf(false) }
    var showServerDialog by remember { mutableStateOf(false) }
    var tempServerUrl by remember { mutableStateOf(serverUrl) }

    val focusManager = LocalFocusManager.current
    val colors = GlobalSendThemeTokens.colors

    LaunchedEffect(authState) {
        if (authState is AuthUiState.Success) {
            onNavigateToMain()
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
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Top Bar with Server Config Shortcut
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(colors.accent),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "GS",
                            color = Color(0xFF111111),
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "GLOBAL SEND",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Black
                    )
                }

                IconButton(onClick = {
                    tempServerUrl = serverUrl
                    showServerDialog = true
                }) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = "Server Settings",
                        tint = colors.textSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // 1. Eyebrow
            Text(
                text = "v2.0 · end-to-end encrypted transfer & vault",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.accent,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 2. Main Title Row: Peace sign + SEND FILES ANYWHERE + Eyes sticker
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.sticker_peace),
                    contentDescription = "Peace Sticker",
                    modifier = Modifier
                        .size(46.dp)
                        .rotate(-12f)
                )

                Spacer(modifier = Modifier.width(10.dp))

                Text(
                    text = "SEND FILES\nANYWHERE.",
                    style = MaterialTheme.typography.headlineLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Black,
                    lineHeight = 36.sp,
                    fontSize = 32.sp,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.width(10.dp))

                Image(
                    painter = painterResource(id = R.drawable.sticker_eyes),
                    contentDescription = "Eyes Sticker",
                    modifier = Modifier
                        .size(46.dp)
                        .rotate(12f)
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // 3. Subtitle Row flanked by Heart & Sunglasses stickers
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(id = R.drawable.sticker_heart),
                    contentDescription = "Heart Sticker",
                    modifier = Modifier
                        .size(30.dp)
                        .rotate(-8f)
                )

                Spacer(modifier = Modifier.width(10.dp))

                Text(
                    text = "Send any size file privately, and keep it as long as you need. End-to-end encrypted transfer with a permanent vault.",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f, fill = false)
                )

                Spacer(modifier = Modifier.width(10.dp))

                Image(
                    painter = painterResource(id = R.drawable.sticker_glasses),
                    contentDescription = "Glasses Sticker",
                    modifier = Modifier
                        .size(32.dp)
                        .rotate(8f)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 4. Down Arrow sticker pointing to the login card
            Image(
                painter = painterResource(id = R.drawable.sticker_arrow),
                contentDescription = "Down Arrow",
                modifier = Modifier
                    .size(width = 24.dp, height = 36.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // 5. Card Container (Matches website VaultPreview Card)
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(BorderStroke(1.dp, colors.borderSubtle), RoundedCornerShape(20.dp)),
                shape = RoundedCornerShape(20.dp),
                color = colors.surface,
                tonalElevation = 2.dp
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Badges Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(BadgeLimeBg)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "E2EE AES-256",
                                color = BadgeLimeText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(BadgeCoralBg)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "ZERO TRACES",
                                color = BadgeCoralText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black
                            )
                        }

                        Spacer(modifier = Modifier.width(6.dp))

                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(BadgePurpleBg)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "TELEGRAM CLOUD",
                                color = BadgePurpleText,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Access Your Encrypted Vault",
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    GlobalSendTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = "USERNAME",
                        placeholder = "e.g. alexander",
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = colors.textSecondary)
                        },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    GlobalSendTextField(
                        value = key,
                        onValueChange = { key = it },
                        label = "LOGIN KEY",
                        placeholder = "Your secret passphrase or private key",
                        leadingIcon = {
                            Icon(Icons.Default.Key, contentDescription = null, tint = colors.textSecondary)
                        },
                        trailingIcon = {
                            IconButton(onClick = { showKey = !showKey }) {
                                Icon(
                                    imageVector = if (showKey) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = if (showKey) "Hide key" else "Show key",
                                    tint = colors.textSecondary
                                )
                            }
                        },
                        visualTransformation = if (showKey) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            focusManager.clearFocus()
                            viewModel.login(username, key)
                        }),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    GlobalSendButton(
                        text = "Unlock Vault",
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.login(username, key)
                        },
                        loading = authState is AuthUiState.Loading,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Forgot your key? Recover using security question",
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.accent,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier
                            .clickable { onNavigateToRecovery() }
                            .padding(4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Bottom Registration Prompt
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Need a new locker? ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary
                )
                Text(
                    text = "Create Vault",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.accent,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Server URL Dialog
        if (showServerDialog) {
            AlertDialog(
                onDismissRequest = { showServerDialog = false },
                title = { Text("Local / Network Server", color = colors.textPrimary, fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text(
                            text = "Connect directly to your local PC or self-hosted Global Send instance without Vercel.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        // Quick Selection Chips
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { tempServerUrl = "https://global-send-v2.vercel.app" }
                                    .background(BadgeLimeBg)
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "Cloud (Vercel)",
                                    color = BadgeLimeText,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { tempServerUrl = "http://10.5.78.14:3000" }
                                    .background(colors.surfaceSecondary)
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "Local PC",
                                    color = colors.textPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable { tempServerUrl = "http://10.0.2.2:3000" }
                                    .background(colors.surfaceSecondary)
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "Emulator",
                                    color = colors.textPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        GlobalSendTextField(
                            value = tempServerUrl,
                            onValueChange = { tempServerUrl = it },
                            placeholder = "https://global-send-v2.vercel.app"
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        viewModel.updateServerUrl(tempServerUrl)
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

        // Error Pill Toast
        val errorMessage = (authState as? AuthUiState.Error)?.message
        FloatingPillToast(
            message = errorMessage,
            visible = errorMessage != null,
            isSuccess = false,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
