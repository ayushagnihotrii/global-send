package com.globalsend.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.globalsend.app.ui.theme.*

enum class ButtonVariant {
    Primary,
    Secondary,
    Destructive,
    Ghost,
    Neon
}

@Composable
fun GlobalSendButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
    leadingIcon: (@Composable () -> Unit)? = null
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.97f else 1.0f, label = "button_scale")

    val colors = GlobalSendThemeTokens.colors

    val containerColor = when (variant) {
        ButtonVariant.Primary -> colors.accent
        ButtonVariant.Secondary -> colors.surfaceSecondary
        ButtonVariant.Destructive -> colors.destructive
        ButtonVariant.Ghost -> Color.Transparent
        ButtonVariant.Neon -> BadgeLimeBg
    }

    val contentColor = when (variant) {
        ButtonVariant.Primary -> Color.White
        ButtonVariant.Secondary -> colors.textPrimary
        ButtonVariant.Destructive -> Color.White
        ButtonVariant.Ghost -> colors.accent
        ButtonVariant.Neon -> BadgeLimeText
    }

    val border = when (variant) {
        ButtonVariant.Secondary -> BorderStroke(1.dp, colors.borderSubtle)
        ButtonVariant.Ghost -> null
        else -> null
    }

    Button(
        onClick = onClick,
        modifier = modifier
            .scale(scale)
            .height(50.dp),
        enabled = enabled && !loading,
        shape = PillShape,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = containerColor.copy(alpha = 0.5f),
            disabledContentColor = contentColor.copy(alpha = 0.5f)
        ),
        border = border,
        interactionSource = interactionSource,
        contentPadding = PaddingValues(horizontal = 24.dp)
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = contentColor,
                strokeWidth = 2.dp
            )
        } else {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (leadingIcon != null) {
                    leadingIcon()
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text,
                    style = MaterialTheme.typography.labelLarge,
                    color = contentColor
                )
            }
        }
    }
}
