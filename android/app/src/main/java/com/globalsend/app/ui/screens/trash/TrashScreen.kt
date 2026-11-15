package com.globalsend.app.ui.screens.trash

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.RestoreFromTrash
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.ItemDto
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendTopBar
import com.globalsend.app.ui.theme.CardShape
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.PillShape
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun TrashScreen(
    onNavigateBack: () -> Unit
) {
    val colors = GlobalSendThemeTokens.colors
    val vaultRepository = GlobalSendApp.instance.vaultRepository
    val coroutineScope = rememberCoroutineScope()

    val trashItems by vaultRepository.trashItems.collectAsState(initial = emptyList())
    var toastMessage by remember { mutableStateOf<String?>(null) }
    var showEmptyTrashDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        vaultRepository.refreshItems(inTrash = true)
    }

    LaunchedEffect(toastMessage) {
        if (toastMessage != null) {
            delay(2500)
            toastMessage = null
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
            GlobalSendTopBar(
                title = "Trash",
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = colors.textPrimary)
                    }
                },
                actions = {
                    if (trashItems.isNotEmpty()) {
                        TextButton(onClick = { showEmptyTrashDialog = true }) {
                            Text("Empty", color = colors.destructive, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            )

            if (trashItems.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.DeleteForever,
                            contentDescription = null,
                            tint = colors.textTertiary,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "Trash is Empty",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(trashItems, key = { it.id }) { item ->
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(CardShape)
                                .background(colors.surfaceElevated)
                                .padding(16.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = item.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = colors.textPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = item.textContent ?: item.url ?: item.file?.originalFilename ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.textSecondary,
                                        maxLines = 1
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(onClick = {
                                        coroutineScope.launch {
                                            val res = vaultRepository.restoreItem(item.id)
                                            if (res.isSuccess) {
                                                toastMessage = "Item restored to vault"
                                            }
                                        }
                                    }) {
                                        Icon(Icons.Default.RestoreFromTrash, contentDescription = "Restore", tint = colors.accent)
                                    }

                                    IconButton(onClick = {
                                        coroutineScope.launch {
                                            val res = vaultRepository.deleteItem(item.id, permanent = true)
                                            if (res.isSuccess) {
                                                toastMessage = "Permanently deleted"
                                            }
                                        }
                                    }) {
                                        Icon(Icons.Default.DeleteForever, contentDescription = "Delete Forever", tint = colors.destructive)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Empty Trash Dialog
        if (showEmptyTrashDialog) {
            AlertDialog(
                onDismissRequest = { showEmptyTrashDialog = false },
                title = { Text("Empty Trash?", color = colors.textPrimary) },
                text = {
                    Text(
                        "All items in the trash will be permanently wiped from relays and cloud storage. This cannot be undone.",
                        color = colors.textSecondary
                    )
                },
                confirmButton = {
                    TextButton(onClick = {
                        showEmptyTrashDialog = false
                        coroutineScope.launch {
                            val res = vaultRepository.emptyTrash()
                            if (res.isSuccess) {
                                toastMessage = "Trash emptied"
                            }
                        }
                    }) {
                        Text("Empty Trash", color = colors.destructive)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showEmptyTrashDialog = false }) {
                        Text("Cancel", color = colors.textSecondary)
                    }
                },
                containerColor = colors.surfaceElevated
            )
        }

        FloatingPillToast(
            message = toastMessage,
            visible = toastMessage != null,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
