package com.globalsend.app.ui.navigation

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.globalsend.app.ui.screens.auth.LoginScreen
import com.globalsend.app.ui.screens.auth.RecoveryScreen
import com.globalsend.app.ui.screens.auth.RegisterScreen
import com.globalsend.app.ui.screens.chat.ChatConversationScreen
import com.globalsend.app.ui.screens.main.MainScreen
import com.globalsend.app.ui.screens.splash.SplashScreen
import com.globalsend.app.ui.screens.trash.TrashScreen
import com.globalsend.app.ui.screens.vault.ItemDetailScreen

@Composable
fun RootNavGraph(
    navController: NavHostController = rememberNavController(),
    sharedText: String? = null,
    sharedUri: Uri? = null,
    onClearSharedData: () -> Unit = {}
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigateToMain = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToLogin = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToMain = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Screen.Register.route)
                },
                onNavigateToRecovery = {
                    navController.navigate(Screen.Recovery.route)
                }
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onNavigateToMain = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Register.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Recovery.route) {
            RecoveryScreen(
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Main.route) {
            MainScreen(
                onNavigateToDetail = { itemId ->
                    navController.navigate(Screen.ItemDetail.createRoute(itemId))
                },
                onNavigateToConversation = { convId, peerUsername ->
                    navController.navigate(Screen.ChatConversation.createRoute(convId, peerUsername))
                },
                onNavigateToTrash = {
                    navController.navigate(Screen.Trash.route)
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                },
                sharedText = sharedText,
                sharedUri = sharedUri,
                onClearSharedData = onClearSharedData
            )
        }

        composable(
            route = Screen.ItemDetail.route,
            arguments = listOf(navArgument("itemId") { type = NavType.StringType })
        ) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getString("itemId") ?: ""
            ItemDetailScreen(
                itemId = itemId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Screen.ChatConversation.route,
            arguments = listOf(
                navArgument("conversationId") { type = NavType.StringType },
                navArgument("peerUsername") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val convId = backStackEntry.arguments?.getString("conversationId") ?: ""
            val peer = backStackEntry.arguments?.getString("peerUsername") ?: ""
            ChatConversationScreen(
                conversationId = convId,
                peerUsername = peer,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Trash.route) {
            TrashScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
