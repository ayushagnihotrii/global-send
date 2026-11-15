package com.globalsend.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.globalsend.app.ui.theme.*

@Composable
fun TagBadge(
    text: String,
    modifier: Modifier = Modifier,
    backgroundColor: Color = GlobalSendThemeTokens.colors.surfaceSecondary,
    textColor: Color = GlobalSendThemeTokens.colors.textPrimary,
    icon: ImageVector? = null,
    onClick: (() -> Unit)? = null
) {
    val shape = RoundedCornerShape(8.dp)
    val clickModifier = if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier

    Box(
        modifier = modifier
            .clip(shape)
            .then(clickModifier)
            .background(backgroundColor, shape)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = textColor,
                    modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
            }
            Text(
                text = text.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = textColor
            )
        }
    }
}

@Composable
fun ItemTypeBadge(type: String, isQuestion: Boolean = false) {
    when {
        isQuestion -> {
            TagBadge(
                text = "QUESTION",
                backgroundColor = BadgeCoralBg,
                textColor = BadgeCoralText
            )
        }
        type == "text" -> {
            TagBadge(
                text = "NOTE",
                backgroundColor = BadgeLimeBg,
                textColor = BadgeLimeText
            )
        }
        type == "link" -> {
            TagBadge(
                text = "LINK",
                backgroundColor = BadgeSkyBg,
                textColor = BadgeSkyText
            )
        }
        type == "image" -> {
            TagBadge(
                text = "PHOTO",
                backgroundColor = BadgePurpleBg,
                textColor = BadgePurpleText
            )
        }
        type == "video" -> {
            TagBadge(
                text = "VIDEO",
                backgroundColor = BadgeAmberBg,
                textColor = Color.White
            )
        }
        else -> {
            TagBadge(
                text = "FILE",
                backgroundColor = GlobalSendThemeTokens.colors.surfaceSecondary,
                textColor = GlobalSendThemeTokens.colors.textPrimary
            )
        }
    }
}
