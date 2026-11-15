package com.globalsend.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

@Immutable
data class GlobalSendCustomColors(
    val bgMain: Color,
    val surface: Color,
    val surfaceSecondary: Color,
    val surfaceElevated: Color,
    val borderSubtle: Color,
    val borderHover: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val accent: Color,
    val accentSubtle: Color,
    val destructive: Color,
    val success: Color,
    val warning: Color,
    val isDark: Boolean
)

val LocalGlobalSendColors = staticCompositionLocalOf {
    GlobalSendCustomColors(
        bgMain = BgMainDark,
        surface = SurfaceDark,
        surfaceSecondary = SurfaceSecondaryDark,
        surfaceElevated = SurfaceElevatedDark,
        borderSubtle = BorderSubtleDark,
        borderHover = BorderHoverDark,
        textPrimary = TextPrimaryDark,
        textSecondary = TextSecondaryDark,
        textTertiary = TextTertiaryDark,
        accent = AccentDark,
        accentSubtle = AccentSubtleDark,
        destructive = DestructiveDark,
        success = SuccessDark,
        warning = WarningDark,
        isDark = true
    )
}

private val DarkColorScheme = darkColorScheme(
    primary = AccentDark,
    onPrimary = Color.White,
    primaryContainer = AccentSubtleDark,
    onPrimaryContainer = AccentDark,
    secondary = SurfaceSecondaryDark,
    onSecondary = TextPrimaryDark,
    background = BgMainDark,
    onBackground = TextPrimaryDark,
    surface = SurfaceDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = SurfaceSecondaryDark,
    onSurfaceVariant = TextSecondaryDark,
    outline = BorderSubtleDark,
    error = DestructiveDark,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = AccentLight,
    onPrimary = Color.White,
    primaryContainer = AccentSubtleLight,
    onPrimaryContainer = AccentLight,
    secondary = SurfaceSecondaryLight,
    onSecondary = TextPrimaryLight,
    background = BgMainLight,
    onBackground = TextPrimaryLight,
    surface = SurfaceLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = SurfaceSecondaryLight,
    onSurfaceVariant = TextSecondaryLight,
    outline = BorderSubtleLight,
    error = DestructiveLight,
    onError = Color.White
)

@Composable
fun GlobalSendTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val customColors = if (darkTheme) {
        GlobalSendCustomColors(
            bgMain = BgMainDark,
            surface = SurfaceDark,
            surfaceSecondary = SurfaceSecondaryDark,
            surfaceElevated = SurfaceElevatedDark,
            borderSubtle = BorderSubtleDark,
            borderHover = BorderHoverDark,
            textPrimary = TextPrimaryDark,
            textSecondary = TextSecondaryDark,
            textTertiary = TextTertiaryDark,
            accent = AccentDark,
            accentSubtle = AccentSubtleDark,
            destructive = DestructiveDark,
            success = SuccessDark,
            warning = WarningDark,
            isDark = true
        )
    } else {
        GlobalSendCustomColors(
            bgMain = BgMainLight,
            surface = SurfaceLight,
            surfaceSecondary = SurfaceSecondaryLight,
            surfaceElevated = SurfaceElevatedLight,
            borderSubtle = BorderSubtleLight,
            borderHover = BorderHoverLight,
            textPrimary = TextPrimaryLight,
            textSecondary = TextSecondaryLight,
            textTertiary = TextTertiaryLight,
            accent = AccentLight,
            accentSubtle = AccentSubtleLight,
            destructive = DestructiveLight,
            success = SuccessLight,
            warning = WarningLight,
            isDark = false
        )
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = customColors.bgMain.toArgb()
                window.navigationBarColor = customColors.bgMain.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !darkTheme
                insetsController.isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(LocalGlobalSendColors provides customColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Typography,
            shapes = Shapes,
            content = content
        )
    }
}

object GlobalSendThemeTokens {
    val colors: GlobalSendCustomColors
        @Composable
        get() = LocalGlobalSendColors.current
}
