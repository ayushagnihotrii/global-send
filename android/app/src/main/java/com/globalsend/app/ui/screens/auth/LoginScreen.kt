package com.globalsend.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.GlobalSendTextField
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
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar with Server Config Shortcut
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
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

            // Main Branding & Login Card
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape)
                        .background(colors.accent),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "GS",
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                        fontSize = 24.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Welcome to Global Send",
                    style = MaterialTheme.typography.headlineMedium,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "Enter your username and private key to access your locker.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary
                )

                Spacer(modifier = Modifier.height(32.dp))

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

                Spacer(modifier = Modifier.height(16.dp))

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

                Spacer(modifier = Modifier.height(24.dp))

                GlobalSendButton(
                    text = "Unlock Vault",
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.login(username, key)
                    },
                    loading = authState is AuthUiState.Loading,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Forgot your key? Recover using security question",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.accent,
                    modifier = Modifier
                        .clickable { onNavigateToRecovery() }
                        .padding(8.dp)
                )
            }

            // Bottom Registration Prompt
            Row(
                modifier = Modifier.padding(top = 24.dp),
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
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onNavigateToRegister() }
                )
            }
        }

        // Server URL Dialog
        if (showServerDialog) {
            AlertDialog(
                onDismissRequest = { showServerDialog = false },
                title = { Text("Backend Server URL", color = colors.textPrimary) },
                text = {
                    Column {
                        Text(
                            text = "Specify your Global Send server instance.",
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
