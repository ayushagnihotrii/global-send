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
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QuestionMark
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.GlobalSendTextField
import com.globalsend.app.ui.theme.GlobalSendThemeTokens

val PRESET_QUESTIONS = listOf(
    "What was the name of your first childhood imaginary friend or first pet?",
    "What was the street name of the first residence you remember living at?",
    "What was the title of the first movie or play you saw in a theater?",
    "In what city or town did your parents or guardians first meet?",
    "What was the model of your very first computer, phone, or gaming console?",
    "What was the first music concert or live show you attended?",
    "What was the surname of your favorite teacher who inspired you most?",
    "What was the nickname your childhood friends or family called you?"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onNavigateToMain: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val authState by viewModel.authState.collectAsState()

    var username by remember { mutableStateOf("") }
    var key by remember { mutableStateOf("") }
    var selectedQuestion by remember { mutableStateOf(PRESET_QUESTIONS[0]) }
    var securityAnswer by remember { mutableStateOf("") }
    var expandedQuestionDropdown by remember { mutableStateOf(false) }

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
                    text = "Create Locker",
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            Text(
                text = "Zero-dependency, fully private locker. No email, phone number, or tracking required.",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.textSecondary
            )

            Spacer(modifier = Modifier.height(24.dp))

            GlobalSendTextField(
                value = username,
                onValueChange = { username = it },
                label = "CHOOSE USERNAME",
                placeholder = "e.g. quantum",
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
                label = "PRIVATE LOGIN KEY",
                placeholder = "Create a strong passphrase or key",
                leadingIcon = {
                    Icon(Icons.Default.Key, contentDescription = null, tint = colors.textSecondary)
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Security Question Section
            Text(
                text = "SECURITY RECOVERY QUESTION",
                style = MaterialTheme.typography.labelMedium,
                color = colors.textSecondary,
                modifier = Modifier.padding(bottom = 6.dp, start = 4.dp)
            )

            ExposedDropdownMenuBox(
                expanded = expandedQuestionDropdown,
                onExpandedChange = { expandedQuestionDropdown = !expandedQuestionDropdown }
            ) {
                OutlinedTextField(
                    value = selectedQuestion,
                    onValueChange = {},
                    readOnly = true,
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedQuestionDropdown) },
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = colors.surface,
                        unfocusedContainerColor = colors.surface,
                        focusedBorderColor = colors.borderHover,
                        unfocusedBorderColor = colors.borderSubtle,
                        focusedTextColor = colors.textPrimary,
                        unfocusedTextColor = colors.textPrimary
                    )
                )

                ExposedDropdownMenu(
                    expanded = expandedQuestionDropdown,
                    onDismissRequest = { expandedQuestionDropdown = false },
                    modifier = Modifier.background(colors.surfaceElevated)
                ) {
                    PRESET_QUESTIONS.forEach { q ->
                        DropdownMenuItem(
                            text = { Text(q, color = colors.textPrimary, style = MaterialTheme.typography.bodySmall) },
                            onClick = {
                                selectedQuestion = q
                                expandedQuestionDropdown = false
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            GlobalSendTextField(
                value = securityAnswer,
                onValueChange = { securityAnswer = it },
                label = "SECURITY ANSWER",
                placeholder = "Your secret recovery answer",
                leadingIcon = {
                    Icon(Icons.Default.Security, contentDescription = null, tint = colors.textSecondary)
                },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    focusManager.clearFocus()
                    viewModel.register(username, key, selectedQuestion, securityAnswer)
                }),
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(30.dp))

            GlobalSendButton(
                text = "Initialize Vault",
                onClick = {
                    focusManager.clearFocus()
                    viewModel.register(username, key, selectedQuestion, securityAnswer)
                },
                loading = authState is AuthUiState.Loading,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(20.dp))

            Row(
                modifier = Modifier.align(Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Already have a vault? ",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary
                )
                Text(
                    text = "Sign In",
                    style = MaterialTheme.typography.bodyMedium,
                    color = colors.accent,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.clickable { onNavigateBack() }
                )
            }
        }

        val errorMessage = (authState as? AuthUiState.Error)?.message
        FloatingPillToast(
            message = errorMessage,
            visible = errorMessage != null,
            isSuccess = false,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
