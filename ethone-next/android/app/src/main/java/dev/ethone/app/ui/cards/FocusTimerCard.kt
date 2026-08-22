package dev.ethone.app.ui.cards

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ethone.app.service.LocalNotificationManager
import dev.ethone.app.ui.components.LiquidGlassSurface
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthonePink
import dev.ethone.app.ui.theme.EthonePurple
import kotlinx.coroutines.delay

@Composable
fun FocusTimerCard() {
    val haptic = LocalHapticFeedback.current
    val total = 25 * 60
    var remaining by remember { mutableIntStateOf(total) }
    var running by remember { mutableStateOf(false) }
    val progress = 1f - remaining.toFloat() / total

    val animatedProgress by animateFloatAsState(
        targetValue = progress,
        label = "focusProgress"
    )

    LaunchedEffect(running) {
        while (running && remaining > 0) {
            delay(1000)
            remaining -= 1
        }
        if (remaining <= 0) {
            running = false
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        }
    }

    LiquidGlassSurface(modifier = Modifier.height(260.dp)) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Focus",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = formatSeconds(remaining),
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Box(contentAlignment = Alignment.Center, modifier = Modifier.height(100.dp)) {
                Canvas(modifier = Modifier.size(90.dp)) {
                    drawCircle(
                        color = Color.White.copy(alpha = 0.1f),
                        style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                    )
                    drawArc(
                        brush = Brush.sweepGradient(
                            listOf(EthoneCyan, EthonePink, EthonePurple, EthoneCyan)
                        ),
                        startAngle = -90f,
                        sweepAngle = animatedProgress * 360f,
                        useCenter = false,
                        style = Stroke(width = 8.dp.toPx(), cap = StrokeCap.Round)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (remaining == 0) remaining = total
                        if (running) {
                            LocalNotificationManager.cancelFocusEnd()
                        } else if (remaining == total) {
                            LocalNotificationManager.scheduleFocusEnd(remaining.toLong())
                        }
                        running = !running
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        imageVector = if (running) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = null
                    )
                }
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        LocalNotificationManager.cancelFocusEnd()
                        running = false
                        remaining = total
                    }
                ) {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = null)
                }
            }
        }
    }
}

private fun formatSeconds(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return String.format("%02d:%02d", m, s)
}
