package com.globalsend.app.ui.screens.vault

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.globalsend.app.ui.components.*
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.ModalSheetShape
import com.globalsend.app.ui.theme.PillShape
import java.io.File
import java.io.FileOutputStream

enum class ComposerTab {
    Text,
    Link,
    File
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ComposerBottomSheet(
    onDismiss: () -> Unit,
    viewModel: VaultViewModel,
    initialSharedText: String? = null,
    initialSharedUri: Uri? = null
) {
    val context = LocalContext.current
    val colors = GlobalSendThemeTokens.colors

    var currentTab by remember {
        mutableStateOf(
            if (initialSharedUri != null) ComposerTab.File
            else if (initialSharedText?.startsWith("http://") == true || initialSharedText?.startsWith("https://") == true) ComposerTab.Link
            else ComposerTab.Text
        )
    }

    var title by remember { mutableStateOf("") }
    var textContent by remember { mutableStateOf(initialSharedText ?: "") }
    var urlContent by remember { mutableStateOf(initialSharedText ?: "") }
    var isQuestion by remember { mutableStateOf(false) }
    var tagsInput by remember { mutableStateOf("") }
    var selectedExpirationSeconds by remember { mutableStateOf(86400L) } // 24 hours default

    var selectedFileUri by remember { mutableStateOf<Uri?>(initialSharedUri) }
    var selectedFileName by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }

    val filePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            selectedFileUri = uri
            selectedFileName = uri.lastPathSegment ?: "selected_file"
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = ModalSheetShape,
        containerColor = colors.surfaceElevated
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Sheet Header with Tabs
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Quick Save",
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.textPrimary,
                    fontWeight = FontWeight.Bold
                )

                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.textSecondary)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Segmented Tab Picker (Text, Link, File)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(PillShape)
                    .background(colors.surfaceSecondary)
                    .padding(4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                listOf(
                    ComposerTab.Text to "Note / Code",
                    ComposerTab.Link to "Link",
                    ComposerTab.File to "File / Media"
                ).forEach { (tab, label) ->
                    val isSelected = currentTab == tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(PillShape)
                            .clickable { currentTab = tab }
                            .background(if (isSelected) colors.accent else androidx.compose.ui.graphics.Color.Transparent)
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (isSelected) androidx.compose.ui.graphics.Color.White else colors.textSecondary,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Common Title Field
            GlobalSendTextField(
                value = title,
                onValueChange = { title = it },
                label = "TITLE (OPTIONAL)",
                placeholder = "Give it a memorable label",
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(16.dp))

            when (currentTab) {
                ComposerTab.Text -> {
                    // Monospace Question toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { isQuestion = !isQuestion }
                            .background(colors.surface)
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Code / Exam Question Mode",
                                style = MaterialTheme.typography.bodyMedium,
                                color = colors.textPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Uses monospace font and preserves exact formatting",
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.textSecondary
                            )
                        }
                        Switch(
                            checked = isQuestion,
                            onCheckedChange = { isQuestion = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = androidx.compose.ui.graphics.Color.White,
                                checkedTrackColor = colors.accent
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    GlobalSendTextField(
                        value = textContent,
                        onValueChange = { textContent = it },
                        label = "CONTENT",
                        placeholder = if (isQuestion) "Paste code snippet or question here..." else "Write note...",
                        singleLine = false,
                        minLines = 5,
                        maxLines = 12,
                        isMonospace = isQuestion,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                ComposerTab.Link -> {
                    GlobalSendTextField(
                        value = urlContent,
                        onValueChange = { urlContent = it },
                        label = "WEBSITE URL",
                        placeholder = "https://example.com/article",
                        leadingIcon = {
                            Icon(Icons.Default.Link, contentDescription = null, tint = colors.textSecondary)
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                ComposerTab.File -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .clickable { filePicker.launch("*/*") }
                            .background(colors.surface)
                            .padding(20.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.CloudUpload,
                                contentDescription = "Upload",
                                tint = colors.accent,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = selectedFileName ?: "Tap to choose a photo, video, or document",
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (selectedFileName != null) colors.textPrimary else colors.textSecondary,
                                fontWeight = if (selectedFileName != null) FontWeight.Bold else FontWeight.Normal
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Tags Field
            GlobalSendTextField(
                value = tagsInput,
                onValueChange = { tagsInput = it },
                label = "TAGS (COMMA SEPARATED)",
                placeholder = "exam, algorithms, reference",
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Expiration (TTL) Selector
            ExpirationSelector(
                selectedSeconds = selectedExpirationSeconds,
                onSelect = { selectedExpirationSeconds = it },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Save / Upload Action
            GlobalSendButton(
                text = if (currentTab == ComposerTab.File) "Upload to Vault" else "Save to Vault",
                onClick = {
                    val parsedTags = tagsInput.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    when (currentTab) {
                        ComposerTab.Text -> {
                            if (textContent.isNotBlank()) {
                                viewModel.createTextItem(
                                    title = title.ifBlank { null },
                                    textContent = textContent,
                                    isQuestion = isQuestion,
                                    tags = parsedTags,
                                    expirationSeconds = selectedExpirationSeconds,
                                    onSuccess = onDismiss
                                )
                            }
                        }
                        ComposerTab.Link -> {
                            if (urlContent.isNotBlank()) {
                                viewModel.createLinkItem(
                                    url = urlContent,
                                    title = title.ifBlank { null },
                                    tags = parsedTags,
                                    expirationSeconds = selectedExpirationSeconds,
                                    onSuccess = onDismiss
                                )
                            }
                        }
                        ComposerTab.File -> {
                            val uri = selectedFileUri
                            if (uri != null) {
                                isUploading = true
                                try {
                                    val inputStream = context.contentResolver.openInputStream(uri)
                                    val tempFile = File(context.cacheDir, selectedFileName ?: "upload_${System.currentTimeMillis()}")
                                    val outputStream = FileOutputStream(tempFile)
                                    inputStream?.copyTo(outputStream)
                                    inputStream?.close()
                                    outputStream.close()

                                    val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"
                                    viewModel.uploadFile(
                                        file = tempFile,
                                        mimeType = mimeType,
                                        title = title.ifBlank { null },
                                        tags = parsedTags,
                                        expirationSeconds = selectedExpirationSeconds,
                                        onSuccess = {
                                            isUploading = false
                                            onDismiss()
                                        }
                                    )
                                } catch (e: Exception) {
                                    isUploading = false
                                }
                            }
                        }
                    }
                },
                loading = isUploading,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
