package dev.ethone.app.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.service.AudioManager
import dev.ethone.app.service.FocusManager
import dev.ethone.app.service.FocusPreset
import dev.ethone.app.ui.components.EthoneCard
import dev.ethone.app.ui.theme.EthoneAmber
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthoneRose

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FocusScreen() {
    var showSoundModal by remember { mutableStateOf(false) }

    val animatedProgress by animateFloatAsState(
        targetValue = FocusManager.progress,
        animationSpec = tween(durationMillis = 500),
        label = "FocusProgress"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Preset Selector Row
        LazyRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(FocusPreset.values()) { preset ->
                FilterChip(
                    selected = FocusManager.currentPreset == preset,
                    onClick = { FocusManager.selectPreset(preset) },
                    label = { Text(preset.label, fontSize = 13.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = preset.tint,
                        selectedLabelColor = Color.Black
                    )
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Circular Timer Visual
        Box(
            modifier = Modifier.size(240.dp),
            contentAlignment = Alignment.Center
        ) {
            val tint = FocusManager.currentPreset.tint

            Canvas(modifier = Modifier.size(230.dp)) {
                // Background Track
                drawArc(
                    color = Color.White.copy(alpha = 0.08f),
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round)
                )
                // Progress Arc
                drawArc(
                    color = tint,
                    startAngle = -90f,
                    sweepAngle = animatedProgress * 360f,
                    useCenter = false,
                    style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Round)
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = FocusManager.formattedTime,
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    text = if (FocusManager.isRunning) (if (FocusManager.isPaused) "En pause" else "En cours...") else "Prêt",
                    style = MaterialTheme.typography.bodySmall,
                    color = tint,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Control Buttons
        Row(
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!FocusManager.isRunning) {
                Button(
                    onClick = { FocusManager.start() },
                    colors = ButtonDefaults.buttonColors(containerColor = FocusManager.currentPreset.tint),
                    shape = CircleShape,
                    modifier = Modifier.height(48.dp)
                ) {
                    Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Démarrer", color = Color.Black, fontWeight = FontWeight.Bold)
                }
            } else {
                if (FocusManager.isPaused) {
                    Button(
                        onClick = { FocusManager.resume() },
                        colors = ButtonDefaults.buttonColors(containerColor = FocusManager.currentPreset.tint),
                        shape = CircleShape,
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(imageVector = Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Reprendre", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                } else {
                    OutlinedButton(
                        onClick = { FocusManager.pause() },
                        shape = CircleShape,
                        modifier = Modifier.height(48.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Pause, contentDescription = null, tint = EthoneAmber)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Pause", color = EthoneAmber, fontWeight = FontWeight.Bold)
                    }
                }

                Button(
                    onClick = { FocusManager.stop() },
                    colors = ButtonDefaults.buttonColors(containerColor = EthoneRose.copy(alpha = 0.2f)),
                    shape = CircleShape,
                    modifier = Modifier.height(48.dp)
                ) {
                    Icon(imageVector = Icons.Default.Stop, contentDescription = null, tint = EthoneRose)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Terminer", color = EthoneRose, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(30.dp))

        // Ambient Sound Card
        EthoneCard(modifier = Modifier.fillMaxWidth(), cornerRadius = 20.dp) {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Headphones, contentDescription = null, tint = EthoneCyan)
                        Text(
                            text = "Sons d'Ambiance",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    TextButton(onClick = { showSoundModal = true }) {
                        Text("Mixeur 10 Pistes", color = EthoneCyan, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    AudioManager.tracks.take(4).forEach { track ->
                        val active = track.volume > 0f
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .clickable {
                                    AudioManager.setTrackVolume(track.id, if (active) 0f else 0.6f)
                                }
                                .padding(vertical = 8.dp)
                        ) {
                            Text(
                                text = track.name.split(" ").firstOrNull() ?: "",
                                fontSize = 12.sp,
                                fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                                color = if (active) EthoneCyan else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(100.dp))
    }

    if (showSoundModal) {
        ModalBottomSheet(onDismissRequest = { showSoundModal = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp)
            ) {
                Text(
                    text = "Mixeur d'Ambiances Sonores",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(14.dp))

                AudioManager.tracks.forEach { track ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = track.name,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (track.volume > 0f) FontWeight.Bold else FontWeight.Normal,
                            color = if (track.volume > 0f) EthoneCyan else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.width(140.dp)
                        )

                        Slider(
                            value = track.volume,
                            onValueChange = { AudioManager.setTrackVolume(track.id, it) },
                            colors = SliderDefaults.colors(thumbColor = EthoneCyan, activeTrackColor = EthoneCyan),
                            modifier = Modifier.weight(1f)
                        )

                        Text(
                            text = "${(track.volume * 100).toInt()}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.width(40.dp).padding(start = 6.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    TextButton(onClick = { AudioManager.muteAll() }) {
                        Text("Tout couper", color = MaterialTheme.colorScheme.error)
                    }
                    Button(
                        onClick = { showSoundModal = false },
                        colors = ButtonDefaults.buttonColors(containerColor = EthoneCyan)
                    ) {
                        Text("Terminé", color = Color.Black)
                    }
                }
            }
        }
    }
}
