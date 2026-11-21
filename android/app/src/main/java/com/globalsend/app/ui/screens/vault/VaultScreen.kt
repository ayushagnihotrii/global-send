package com.globalsend.app.ui.screens.vault

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.globalsend.app.R
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendTextField
import com.globalsend.app.ui.components.GlobalSendTopBar
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.PillShape
import kotlinx.coroutines.delay

val VAULT_CATEGORIES = listOf(
    "all" to "All",
    "text" to "Notes",
    "question" to "Questions",
    "link" to "Links",
    "image" to "Photos",
    "video" to "Videos",
    "file" to "Files",
    "favourite" to "Favourites"
)

@Composable
fun VaultScreen(
    onNavigateToDetail: (String) -> Unit,
    viewModel: VaultViewModel = viewModel(),
    initialSharedText: String? = null,
    initialSharedUri: android.net.Uri? = null,
    onClearSharedData: () -> Unit = {}
) {
    val context = LocalContext.current
    val colors = GlobalSendThemeTokens.colors

    val dateGroups by viewModel.filteredGroupedItems.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedCategory by viewModel.selectedCategory.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val toastMessage by viewModel.toastMessage.collectAsState()

    var showComposer by remember { mutableStateOf(initialSharedText != null || initialSharedUri != null) }
    var isSearchActive by remember { mutableStateOf(false) }

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
            // Top App Bar
            GlobalSendTopBar(
                title = "Vault",
                onSearchClick = { isSearchActive = !isSearchActive },
                onAddClick = { showComposer = true }
            )

            // Search Bar (if opened)
            if (isSearchActive) {
                Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    GlobalSendTextField(
                        value = searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        placeholder = "Search notes, code, links, tags...",
                        leadingIcon = {
                            Icon(Icons.Default.Search, contentDescription = null, tint = colors.textSecondary)
                        },
                        trailingIcon = {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { viewModel.setSearchQuery("") }) {
                                    Icon(Icons.Default.Close, contentDescription = "Clear", tint = colors.textSecondary)
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            // Category Filter Chips
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(VAULT_CATEGORIES) { (catId, catLabel) ->
                    val isSelected = selectedCategory == catId
                    val bg = if (isSelected) colors.accent else colors.surfaceSecondary
                    val textColor = if (isSelected) (if (colors.isDark) Color(0xFF111111) else Color.White) else colors.textPrimary

                    Box(
                        modifier = Modifier
                            .clip(PillShape)
                            .clickable { viewModel.setCategory(catId) }
                            .background(bg, PillShape)
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = catLabel,
                            style = MaterialTheme.typography.labelMedium,
                            color = textColor,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    }
                }
            }

            // Timeline Items List
            if (dateGroups.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(bottom = 60.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(
                            painter = painterResource(id = R.drawable.sticker_eyes),
                            contentDescription = "Empty Vault",
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text(
                            text = "Your Locker is Empty",
                            style = MaterialTheme.typography.titleMedium,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Save questions, code snippets, notes, links or files",
                            style = MaterialTheme.typography.bodySmall,
                            color = colors.textSecondary
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { showComposer = true },
                            shape = PillShape,
                            colors = ButtonDefaults.buttonColors(containerColor = colors.accent)
                        ) {
                            Text(
                                "Quick Save Something",
                                color = if (colors.isDark) Color(0xFF111111) else Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    dateGroups.forEach { group ->
                        item {
                            Text(
                                text = group.title.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.textSecondary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 10.dp, bottom = 4.dp, start = 4.dp)
                            )
                        }

                        items(group.items, key = { it.id }) { item ->
                            ItemCard(
                                item = item,
                                onClick = { onNavigateToDetail(item.id) },
                                onCopy = { text -> viewModel.copyToClipboard(context, text) },
                                onToggleFavourite = { viewModel.toggleFavourite(item.id) },
                                onDelete = { viewModel.deleteItem(item.id) }
                            )
                        }
                    }
                }
            }
        }

        // Floating Action Button
        FloatingActionButton(
            onClick = { showComposer = true },
            containerColor = colors.accent,
            contentColor = if (colors.isDark) Color(0xFF111111) else Color.White,
            shape = PillShape,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 20.dp, bottom = 90.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "Quick Save")
        }

        // Quick Composer Bottom Sheet
        if (showComposer) {
            ComposerBottomSheet(
                onDismiss = {
                    showComposer = false
                    onClearSharedData()
                },
                viewModel = viewModel,
                initialSharedText = initialSharedText,
                initialSharedUri = initialSharedUri
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
