package dev.ethone.app.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.service.BiometricPromptManager
import dev.ethone.app.ui.components.BottomTab
import dev.ethone.app.ui.components.NativeFloatingDock

@Composable
fun BentoGridScreen(
    supabaseClient: SupabaseClient = remember { SupabaseClient() }
) {
    var selectedTab by remember { mutableStateOf(BottomTab.Home) }
    var showAuth by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
            when (selectedTab) {
                BottomTab.Home -> HomeScreen(
                    client = supabaseClient,
                    onNavigateTab = { selectedTab = it },
                    onOpenAuth = { showAuth = true }
                )
                BottomTab.Brain -> BrainScreen(client = supabaseClient)
                BottomTab.Tasks -> TasksScreen(client = supabaseClient)
                BottomTab.Focus -> FocusScreen()
                BottomTab.Notes -> NotesScreen(client = supabaseClient)
                BottomTab.Settings -> SettingsScreen()
            }
        }

        NativeFloatingDock(
            selectedTab = selectedTab,
            onTabSelected = { selectedTab = it },
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
        )
    }

    if (showAuth) {
        val biometricPromptManager = remember { BiometricPromptManager() }
        biometricPromptManager.showBiometricPrompt(
            onSuccess = { showAuth = false },
            onError = { showAuth = false },
            onCancel = { showAuth = false }
        )
    }
}
