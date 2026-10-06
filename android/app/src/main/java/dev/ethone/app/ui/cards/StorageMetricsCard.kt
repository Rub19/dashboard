package dev.ethone.app.ui.cards

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.ui.components.EthoneCard
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthonePink
import dev.ethone.app.ui.theme.EthonePurple

data class StorageItem(val label: String, val value: Float, val color: Color)

@Composable
fun StorageMetricsCard(client: SupabaseClient) {
    val notesCount = client.notes.size
    val tasksCount = client.tasks.size
    val filesCount = client.files.size
    val totalCount = notesCount + tasksCount + filesCount

    EthoneCard(modifier = Modifier.height(260.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Stockage",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))

            if (totalCount == 0) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "0 élément enregistré",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                val items = listOfNotNull(
                    if (notesCount > 0) StorageItem("Notes", notesCount.toFloat(), EthonePurple) else null,
                    if (tasksCount > 0) StorageItem("Tâches", tasksCount.toFloat(), EthoneCyan) else null,
                    if (filesCount > 0) StorageItem("Fichiers", filesCount.toFloat(), EthonePink) else null
                )

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Canvas(modifier = Modifier.size(110.dp)) {
                        var startAngle = -90f
                        val total = items.sumOf { it.value.toDouble() }.toFloat()
                        items.forEach { item ->
                            val sweep = (item.value / total) * 360f
                            drawArc(
                                color = item.color,
                                startAngle = startAngle,
                                sweepAngle = sweep,
                                useCenter = false,
                                style = Stroke(width = 18.dp.toPx())
                            )
                            startAngle += sweep
                        }
                    }

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items.forEach { item ->
                            val percent = ((item.value / totalCount) * 100).toInt()
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Canvas(modifier = Modifier.size(8.dp)) {
                                    drawCircle(color = item.color)
                                }
                                Text(
                                    text = "${item.label} : $percent% (${item.value.toInt()})",
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(start = 8.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "$totalCount éléments au total",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
