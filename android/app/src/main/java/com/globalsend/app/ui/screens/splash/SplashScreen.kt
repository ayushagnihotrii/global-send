package com.globalsend.app.ui.screens.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.globalsend.app.GlobalSendApp
import com.globalsend.app.R
import com.globalsend.app.ui.theme.BadgeCoralBg
import com.globalsend.app.ui.theme.BadgeCoralText
import com.globalsend.app.ui.theme.BadgeLimeBg
import com.globalsend.app.ui.theme.BadgeLimeText
import com.globalsend.app.ui.theme.GlobalSendThemeTokens
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(
    onNavigateToMain: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    val scale = remember { Animatable(0.7f) }
    val alpha = remember { Animatable(0f) }
    val stickerRotateLeft = remember { Animatable(-30f) }
    val stickerRotateRight = remember { Animatable(30f) }

    LaunchedEffect(Unit) {
        scale.animateTo(1.0f, animationSpec = tween(600, easing = FastOutSlowInEasing))
        alpha.animateTo(1.0f, animationSpec = tween(500))
        stickerRotateLeft.animateTo(-12f, animationSpec = tween(600))
        stickerRotateRight.animateTo(12f, animationSpec = tween(600))
        delay(900)

        val isLoggedIn = GlobalSendApp.instance.sessionManager.isLoggedIn()
        if (isLoggedIn) {
            onNavigateToMain()
        } else {
            onNavigateToLogin()
        }
    }

    val colors = GlobalSendThemeTokens.colors

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgMain),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .scale(scale.value)
                .alpha(alpha.value)
                .padding(24.dp)
        ) {
            // Row with stickers and center logo
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Pink Peace Sticker
                Image(
                    painter = painterResource(id = R.drawable.sticker_peace),
                    contentDescription = "Peace Sticker",
                    modifier = Modifier
                        .size(54.dp)
                        .rotate(stickerRotateLeft.value)
                )

                Spacer(modifier = Modifier.width(16.dp))

                // GS Circle Logo
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(colors.accent),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "GS",
                        color = Color(0xFF111111),
                        fontWeight = FontWeight.Black,
                        fontSize = 32.sp
                    )
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Googly Eyes Sticker
                Image(
                    painter = painterResource(id = R.drawable.sticker_eyes),
                    contentDescription = "Eyes Sticker",
                    modifier = Modifier
                        .size(54.dp)
                        .rotate(stickerRotateRight.value)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "GLOBAL SEND",
                style = MaterialTheme.typography.headlineLarge,
                color = colors.textPrimary,
                fontWeight = FontWeight.Black,
                letterSpacing = (-0.5).sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "v2.0 · end-to-end encrypted transfer & vault",
                style = MaterialTheme.typography.bodyMedium,
                color = colors.accent,
                fontWeight = FontWeight.SemiBold
            )

            Spacer(modifier = Modifier.height(28.dp))

            // Badges
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(BadgeLimeBg)
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "E2EE AES-256",
                        color = BadgeLimeText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(BadgeCoralBg)
                        .padding(horizontal = 14.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "ZERO RESIDUAL TRACES",
                        color = BadgeCoralText,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
    }
}
