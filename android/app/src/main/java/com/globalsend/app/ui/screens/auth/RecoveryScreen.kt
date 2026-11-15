package com.globalsend.app.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.GlobalSendTextField
import com.globalsend.app.ui.theme.GlobalSendThemeTokens

@Composable
fun RecoveryScreen(
    onNavigateBack: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val recoveryState by viewModel.recoveryState.collectAsState()

    var username by remember { mutableStateOf("") }
    var answer by remember { mutableStateOf("") }
    var newKey by remember { mutableStateOf("") }

    val focusManager = LocalFocusManager.current
    val colors = GlobalSendThemeTokens.colors

    LaunchedEffect(Unit) {
        viewModel.resetRecoveryState()
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
                .padding(24.dp)
        ) {
            // Header with Back button
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(bottom = 20.dp)
            ) {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = colors.textPrimary
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Key Recovery",
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "Global Send uses zero-knowledge security questions to restore access if you lose your private key.",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(24.dp))

            GlobalSendTextField(
                value = username,
                onValueChange = { username = it },
                label = "ACCOUNT USERNAME",
                placeholder = "Enter your username",
                leadingIcon = {
                    Icon(Icons.Default.Person, contentDescription = null, tint = colors.textSecondary)
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (recoveryState !is RecoveryUiState.QuestionLoaded && recoveryState !is RecoveryUiState.ResetSuccess) {
                GlobalSendButton(
                    text = "Find Security Question",
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.fetchRecoveryQuestion(username)
                    },
                    loading = recoveryState is RecoveryUiState.LoadingQuestion,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (recoveryState is RecoveryUiState.QuestionLoaded) {
                val question = (recoveryState as RecoveryUiState.QuestionLoaded).question

                Spacer(modifier = Modifier.height(24.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.surfaceElevated, androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
                        .padding(16.dp)
                ) {
                    Column {
                        Text(
                            text = "SECURITY QUESTION",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.accent,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = question,
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textPrimary
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                GlobalSendTextField(
                    value = answer,
                    onValueChange = { answer = it },
                    label = "SECURITY ANSWER",
                    placeholder = "Enter your answer",
                    leadingIcon = {
                        Icon(Icons.Default.Security, contentDescription = null, tint = colors.textSecondary)
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))

                GlobalSendTextField(
                    value = newKey,
                    onValueChange = { newKey = it },
                    label = "NEW PRIVATE KEY",
                    placeholder = "Create new passphrase",
                    leadingIcon = {
                        Icon(Icons.Default.Key, contentDescription = null, tint = colors.textSecondary)
                    },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(24.dp))

                GlobalSendButton(
                    text = "Reset Private Key",
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.resetKey(username, answer, newKey)
                    },
                    loading = recoveryState is RecoveryUiState.LoadingQuestion,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            if (recoveryState is RecoveryUiState.ResetSuccess) {
                Spacer(modifier = Modifier.height(32.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(colors.surfaceElevated, androidx.compose.foundation.shape.RoundedCornerShape(14.dp))
                        .padding(20.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Key Successfully Reset!",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.success,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "All previous sessions have been safely invalidated. You can now log in with your new key.",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        GlobalSendButton(
                            text = "Back to Sign In",
                            onClick = onNavigateBack,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        val errorMessage = (recoveryState as? RecoveryUiState.Error)?.message
        FloatingPillToast(
            message = errorMessage,
            visible = errorMessage != null,
            isSuccess = false,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
