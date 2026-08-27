package dev.ethone.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Face
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.ui.cards.BrainCaptureCard
import dev.ethone.app.ui.cards.FocusTimerCard
import dev.ethone.app.ui.cards.StorageMetricsCard
import dev.ethone.app.ui.cards.TasksCard
import dev.ethone.app.ui.components.BottomTab
import dev.ethone.app.ui.components.EthoneBrainOrb
import dev.ethone.app.ui.components.EthoneCard
import dev.ethone.app.ui.components.EthoneModelBadge
import dev.ethone.app.ui.components.EthoneStatusBadge
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthoneViolet

@Composable
fun HomeScreen(
    client: SupabaseClient,
    onNavigateTab: (BottomTab) -> Unit,
    onOpenAuth: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
        // Top Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Bonjour Rub",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    EthoneStatusBadge(label = "En ligne", tone = EthoneEmerald)
                }
                Text(
                    text = "Votre espace personnel intelligent",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(onClick = onOpenAuth) {
                Icon(
                    imageVector = Icons.Default.Face,
                    contentDescription = "Déverrouiller",
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // Hero Brain Briefing Card
        EthoneCard(
            modifier = Modifier.fillMaxWidth(),
            cornerRadius = 24.dp
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        EthoneBrainOrb(isThinking = false, size = 28.dp)
                        Text(
                            text = "Briefing Brain",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    EthoneModelBadge(modelName = "Claude 3.7")
                }

                Text(
                    text = "Vous avez ${client.tasks.filter { !it.done }.size} tâches actives aujourd'hui. Vos flux de productivité sont synchronisés.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = { onNavigateTab(BottomTab.Brain) },
                        colors = ButtonDefaults.buttonColors(containerColor = EthoneViolet.copy(alpha = 0.15f))
                    ) {
                        Text("Consulter Brain", color = EthoneViolet, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                        Icon(imageVector = Icons.Default.ArrowForward, contentDescription = null, tint = EthoneViolet, modifier = Modifier.padding(start = 4.dp))
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Bento Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(bottom = 100.dp),
            userScrollEnabled = false,
            modifier = Modifier.height(540.dp)
        ) {
            item { FocusTimerCard() }
            item { TasksCard(client = client) }
            item { BrainCaptureCard(client = client) }
            item { StorageMetricsCard() }
        }
    }
}
