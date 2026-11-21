package com.globalsend.app.ui.screens.vault

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.globalsend.app.data.model.ItemDto
import com.globalsend.app.ui.components.ItemTypeBadge
import com.globalsend.app.ui.components.TagBadge
import com.globalsend.app.ui.theme.CardShape
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.MonospaceCodeStyle
import com.globalsend.app.ui.theme.PillShape
import java.util.Locale

@Composable
fun ItemCard(
    item: ItemDto,
    onClick: () -> Unit,
    onCopy: (String) -> Unit,
    onToggleFavourite: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = GlobalSendThemeTokens.colors
    val isQuestion = item.tags?.contains("question") == true || (item.title?.contains("question", ignoreCase = true) == true)

    val displayTitle = if (!item.title.isNullOrBlank()) {
        item.title
    } else if (item.file != null && !item.file.originalFilename.isNullOrBlank()) {
        item.file.originalFilename
    } else if (!item.url.isNullOrBlank()) {
        item.url
    } else {
        "Untitled Item"
    }

    val copyableContent = item.textContent ?: item.url ?: item.file?.originalFilename ?: displayTitle
    val isPermanent = item.isPermanent || item.expiresAt == null

    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(CardShape)
            .clickable(onClick = onClick)
            .background(colors.surfaceElevated, CardShape)
            .border(1.dp, colors.borderSubtle, CardShape)
            .padding(16.dp)
    ) {
        Column {
            // Top Row: Category Badge + Tags + Permanent Badge + Favourite Star
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    ItemTypeBadge(type = item.type, isQuestion = isQuestion)

                    if (isPermanent) {
                        Box(
                            modifier = Modifier
                                .clip(PillShape)
                                .background(if (colors.isDark) Color(0x33CDFF5D) else Color(0x1F007AFF))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "PERMANENT",
                                style = MaterialTheme.typography.labelSmall,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (colors.isDark) Color(0xFFCDFF5D) else Color(0xFF007AFF)
                            )
                        }
                    }

                    item.tags?.filter { it != "question" }?.take(2)?.forEach { tag ->
                        TagBadge(text = tag)
                    }
                }

                IconButton(
                    onClick = onToggleFavourite,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = if (item.isFavourite) Icons.Filled.Star else Icons.Outlined.StarBorder,
                        contentDescription = "Favourite",
                        tint = if (item.isFavourite) colors.warning else colors.textTertiary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Title
            Text(
                text = displayTitle,
                style = MaterialTheme.typography.titleMedium,
                color = colors.textPrimary,
                fontWeight = FontWeight.Bold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Content Preview (Monospaced if code/question)
            if (!item.textContent.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = item.textContent,
                    style = if (isQuestion) MonospaceCodeStyle else MaterialTheme.typography.bodyMedium,
                    color = colors.textSecondary,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            } else if (!item.url.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = item.url,
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.accent,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            } else if (item.file != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "${item.file.originalFilename} • ${formatFileSize(item.file.fileSize)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = colors.textSecondary,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Bottom Actions: Copy Button + Delete Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Quick Copy Pill
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable { onCopy(copyableContent) }
                        .background(colors.surfaceSecondary)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy",
                            tint = colors.textPrimary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Copy",
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.textPrimary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete",
                        tint = colors.textTertiary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

fun formatFileSize(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val units = arrayOf("B", "KB", "MB", "GB", "TB")
    val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt().coerceIn(0, units.size - 1)
    val value = bytes / Math.pow(1024.0, digitGroups.toDouble())
    return String.format(Locale.US, "%.1f %s", value, units[digitGroups])
}
