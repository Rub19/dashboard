package dev.ethone.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Face
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.service.BiometricPromptManager
import dev.ethone.app.ui.cards.BrainCaptureCard
import dev.ethone.app.ui.cards.FocusTimerCard
import dev.ethone.app.ui.cards.StorageMetricsCard
import dev.ethone.app.ui.cards.TasksCard
import dev.ethone.app.ui.components.BottomTab
import dev.ethone.app.ui.components.NativeFloatingDock

@Composable
fun BentoGridScreen(
    supabaseClient: SupabaseClient = remember { SupabaseClient() }
) {
    var selectedTab by remember { mutableStateOf(BottomTab.Home) }
    var showAuth by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .verticalScroll(rememberScrollState())
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 24.dp)) {
                Text(
                    text = "ETHONE",
                    style = MaterialTheme.typography.displayLarge,
                    color = MaterialTheme.colorScheme.onBackground,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "Tableau de bord natif",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = { showAuth = true },
                    modifier = Modifier.height(40.dp)
                ) {
                    Icon(imageVector = Icons.Default.Face, contentDescription = null)
                    Text("Déverrouiller", modifier = Modifier.padding(start = 8.dp))
                }

                Spacer(modifier = Modifier.height(20.dp))

                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    contentPadding = PaddingValues(bottom = 120.dp),
                    userScrollEnabled = false,
                    modifier = Modifier.height(560.dp)
                ) {
                    item { FocusTimerCard() }
                    item { TasksCard(client = supabaseClient) }
                    item { BrainCaptureCard(client = supabaseClient) }
                    item { StorageMetricsCard() }
                }
            }
        }

        NativeFloatingDock(
            selectedTab = selectedTab,
            onTabSelected = { selectedTab = it },
            modifier = Modifier.fillMaxWidth()
        )
    }

    if (showAuth) {
        BiometricPromptManager.BiometricDialog(
            onAuthenticated = { showAuth = false },
            onDismiss = { showAuth = false }
        )
    }
}
