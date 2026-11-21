package com.globalsend.app.ui.screens.vault

import android.content.Intent
import android.net.Uri
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
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.data.model.ItemDto
import com.globalsend.app.ui.components.FloatingPillToast
import com.globalsend.app.ui.components.GlobalSendButton
import com.globalsend.app.ui.components.ItemTypeBadge
import com.globalsend.app.ui.components.TagBadge
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.MonospaceCodeStyle
import com.globalsend.app.ui.theme.PillShape
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ItemDetailScreen(
    itemId: String,
    onNavigateBack: () -> Unit,
    viewModel: VaultViewModel = viewModel()
) {
    val context = LocalContext.current
    val colors = GlobalSendThemeTokens.colors
    val coroutineScope = rememberCoroutineScope()

    var item by remember { mutableStateOf<ItemDto?>(null) }
    var isMonospace by remember { mutableStateOf(false) }
    val toastMessage by viewModel.toastMessage.collectAsState()

    LaunchedEffect(itemId) {
        val db = GlobalSendApp.instance.database
        val entity = db.itemDao().getItemById(itemId)
        if (entity != null) {
            val dto = entity.toDto()
            item = dto
            isMonospace = dto.tags?.contains("question") == true
        }
    }

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
        if (item == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = colors.accent)
            }
        } else {
            val currentItem = item!!
            val isQuestion = currentItem.tags?.contains("question") == true
            val displayTitle = if (!currentItem.title.isNullOrBlank()) currentItem.title else (currentItem.file?.originalFilename ?: currentItem.url ?: "Untitled Item")
            val copyableContent = currentItem.textContent ?: currentItem.url ?: currentItem.file?.originalFilename ?: displayTitle
            val isPermanent = currentItem.isPermanent || currentItem.expiresAt == null

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
            ) {
                // Top Header Bar
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = colors.textPrimary)
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = {
                            viewModel.toggleFavourite(currentItem.id)
                            item = currentItem.copy(isFavourite = !currentItem.isFavourite)
                        }) {
                            Icon(
                                imageVector = if (currentItem.isFavourite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                                contentDescription = "Favourite",
                                tint = if (currentItem.isFavourite) colors.warning else colors.textTertiary
                            )
                        }

                        IconButton(onClick = {
                            viewModel.deleteItem(currentItem.id)
                            onNavigateBack()
                        }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = colors.destructive)
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp, vertical = 8.dp)
                ) {
                    // Type Badge & TTL info
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ItemTypeBadge(type = currentItem.type, isQuestion = isQuestion)

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Timer,
                                contentDescription = null,
                                tint = if (isPermanent) colors.accent else colors.textSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isPermanent) "Permanent • Never Expires" else "Expires in ${(currentItem.expirationDurationSec / 3600)}h",
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isPermanent) colors.accent else colors.textSecondary,
                                fontWeight = if (isPermanent) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Title
                    Text(
                        text = displayTitle,
                        style = MaterialTheme.typography.headlineMedium,
                        color = colors.textPrimary,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // Monospace Mode Switcher for Text/Question
                    if (currentItem.textContent != null) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(colors.surfaceElevated)
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Monospace Font",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.textSecondary
                            )
                            Switch(
                                checked = isMonospace,
                                onCheckedChange = { isMonospace = it },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                                    checkedTrackColor = colors.accent
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Full content text card
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(colors.surface, RoundedCornerShape(14.dp))
                                .border(1.dp, colors.borderSubtle, RoundedCornerShape(14.dp))
                                .padding(16.dp)
                        ) {
                            Text(
                                text = currentItem.textContent,
                                style = if (isMonospace) MonospaceCodeStyle else MaterialTheme.typography.bodyLarge,
                                color = colors.textPrimary
                            )
                        }
                    }

                    // Link Content View
                    if (currentItem.url != null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .clickable {
                                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(currentItem.url))
                                    context.startActivity(browserIntent)
                                }
                                .background(colors.surfaceElevated)
                                .border(1.dp, colors.borderSubtle, RoundedCornerShape(14.dp))
                                .padding(16.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = colors.accent)
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = currentItem.url,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = colors.accent
                                )
                            }
                        }
                    }

                    // Media File Preview
                    if (currentItem.file != null) {
                        val serverBase = GlobalSendApp.instance.sessionManager.getServerUrl().removeSuffix("/")
                        val fileUrl = "$serverBase/api/storage/file/${currentItem.id}"

                        if (currentItem.type == "image") {
                            Spacer(modifier = Modifier.height(16.dp))
                            AsyncImage(
                                model = fileUrl,
                                contentDescription = currentItem.file.originalFilename,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 350.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(colors.surfaceElevated)
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .clickable {
                                    val downloadIntent = Intent(Intent.ACTION_VIEW, Uri.parse(fileUrl))
                                    context.startActivity(downloadIntent)
                                }
                                .background(colors.surfaceElevated)
                                .border(1.dp, colors.borderSubtle, RoundedCornerShape(14.dp))
                                .padding(16.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Download, contentDescription = null, tint = colors.accent)
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = currentItem.file.originalFilename,
                                        style = MaterialTheme.typography.titleMedium,
                                        color = colors.textPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${currentItem.file.mimeType} • ${formatFileSize(currentItem.file.fileSize)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = colors.textSecondary
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // Quick Copy Verbatim
                    GlobalSendButton(
                        text = "Copy Verbatim to Clipboard",
                        onClick = { viewModel.copyToClipboard(context, copyableContent) },
                        leadingIcon = {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White)
                        },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(30.dp))
                }
            }
        }

        // Pill Toast
        FloatingPillToast(
            message = toastMessage,
            visible = toastMessage != null,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}
