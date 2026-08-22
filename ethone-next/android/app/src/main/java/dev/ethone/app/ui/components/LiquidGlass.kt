package dev.ethone.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.ethone.app.ui.theme.LiquidGlassDarkEnd
import dev.ethone.app.ui.theme.LiquidGlassDarkStart
import dev.ethone.app.ui.theme.LiquidGlassLightEnd
import dev.ethone.app.ui.theme.LiquidGlassLightStart

@Composable
fun LiquidGlassSurface(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    content: @Composable () -> Unit
) {
    val isDark = !MaterialTheme.colorScheme.background.isLight()
    val glassGradient = if (isDark) {
        Brush.linearGradient(
            colors = listOf(LiquidGlassDarkStart, LiquidGlassDarkEnd),
            start = Offset(0f, 0f),
            end = Offset(0f, Float.POSITIVE_INFINITY)
        )
    } else {
        Brush.linearGradient(
            colors = listOf(LiquidGlassLightStart, LiquidGlassLightEnd),
            start = Offset(0f, 0f),
            end = Offset(0f, Float.POSITIVE_INFINITY)
        )
    }
    val specularGradient = Brush.linearGradient(
        colors = listOf(Color.White.copy(alpha = 0.35f), Color.White.copy(alpha = 0.05f), Color.Transparent),
        start = Offset(0f, 0f),
        end = Offset(1000f, 1000f)
    )

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(glassGradient)
            .drawBehind {
                drawRoundRect(
                    brush = specularGradient,
                    size = size,
                    style = Stroke(width = 0.5.dp.toPx())
                )
            }
            .border(
                width = 0.5.dp,
                brush = specularGradient,
                shape = RoundedCornerShape(cornerRadius)
            )
            .blur(24.dp)
    ) {
        content()
    }
}

private fun Color.isLight(): Boolean {
    val luma = (0.299 * red + 0.587 * green + 0.114 * blue)
    return luma > 0.5
}
