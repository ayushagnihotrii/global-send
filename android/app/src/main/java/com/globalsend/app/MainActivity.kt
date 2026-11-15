package com.globalsend.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.globalsend.app.ui.navigation.RootNavGraph
import com.globalsend.app.ui.theme.GlobalSendTheme
import com.globalsend.app.ui.theme.GlobalSendThemeTokens

class MainActivity : ComponentActivity() {

    private val sharedTextState = mutableStateOf<String?>(null)
    private val sharedUriState = mutableStateOf<Uri?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        handleShareIntent(intent)

        setContent {
            val app = GlobalSendApp.instance
            val themeMode by remember { mutableStateOf(app.sessionManager.getThemeMode()) }
            val isDark = when (themeMode) {
                "light" -> false
                else -> true
            }

            GlobalSendTheme(darkTheme = isDark) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = GlobalSendThemeTokens.colors.bgMain
                ) {
                    RootNavGraph(
                        sharedText = sharedTextState.value,
                        sharedUri = sharedUriState.value,
                        onClearSharedData = {
                            sharedTextState.value = null
                            sharedUriState.value = null
                        }
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShareIntent(intent)
    }

    private fun handleShareIntent(intent: Intent?) {
        if (intent == null) return
        when (intent.action) {
            Intent.ACTION_SEND -> {
                if (intent.type == "text/plain") {
                    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
                    if (!text.isNullOrBlank()) {
                        sharedTextState.value = text
                    }
                } else {
                    val uri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                    if (uri != null) {
                        sharedUriState.value = uri
                    }
                }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                val uris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
                if (!uris.isNullOrEmpty()) {
                    sharedUriState.value = uris.first()
                }
            }
        }
    }
}
