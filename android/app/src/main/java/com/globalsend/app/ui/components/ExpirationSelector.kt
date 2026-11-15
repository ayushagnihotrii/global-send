package com.globalsend.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import com.globalsend.app.ui.theme.PillShape

data class ExpirationPreset(
    val label: String,
    val shortLabel: String,
    val seconds: Long
)

val EXPIRATION_PRESETS = listOf(
    ExpirationPreset("1 hour", "1h", 3600L),
    ExpirationPreset("6 hours", "6h", 21600L),
    ExpirationPreset("12 hours", "12h", 43200L),
    ExpirationPreset("24 hours", "24h", 86400L),
    ExpirationPreset("3 days", "3d", 259200L),
    ExpirationPreset("7 days", "7d", 604800L)
)

@Composable
fun ExpirationSelector(
    selectedSeconds: Long,
    onSelect: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = GlobalSendThemeTokens.colors

    Column(modifier = modifier) {
        Text(
            text = "DISINTEGRATION TIMER (TTL)",
            style = MaterialTheme.typography.labelSmall,
            color = colors.textSecondary,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            items(EXPIRATION_PRESETS) { preset ->
                val isSelected = preset.seconds == selectedSeconds
                val bgColor = if (isSelected) colors.accent else colors.surfaceSecondary
                val textColor = if (isSelected) androidx.compose.ui.graphics.Color.White else colors.textPrimary

                Box(
                    modifier = Modifier
                        .clip(PillShape)
                        .clickable { onSelect(preset.seconds) }
                        .background(bgColor, PillShape)
                        .border(
                            width = 1.dp,
                            color = if (isSelected) colors.accent else colors.borderSubtle,
                            shape = PillShape
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = preset.label,
                        style = MaterialTheme.typography.labelMedium,
                        color = textColor
                    )
                }
            }
        }
    }
}
