package dev.ethone.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.ui.theme.EthoneBgRaised
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthoneViolet
import dev.ethone.app.ui.theme.LiquidGlassDarkEnd
import dev.ethone.app.ui.theme.LiquidGlassDarkStart
import dev.ethone.app.ui.theme.LiquidGlassLightEnd
import dev.ethone.app.ui.theme.LiquidGlassLightStart

@Composable
fun LiquidGlassSurface(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 24.dp,
    tint: Color? = null,
    content: @Composable () -> Unit
) {
    val isDark = !MaterialTheme.colorScheme.background.isLight()
    val baseFill = if (isDark) {
        Brush.linearGradient(
            colors = listOf(
                tint?.copy(alpha = 0.20f) ?: LiquidGlassDarkStart,
                LiquidGlassDarkEnd
            ),
            start = Offset(0f, 0f),
            end = Offset(0f, Float.POSITIVE_INFINITY)
        )
    } else {
        Brush.linearGradient(
            colors = listOf(
                tint?.copy(alpha = 0.16f) ?: LiquidGlassLightStart,
                LiquidGlassLightEnd
            ),
            start = Offset(0f, 0f),
            end = Offset(0f, Float.POSITIVE_INFINITY)
        )
    }

    val specularGradient = remember {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.40f),
                Color.White.copy(alpha = 0.10f),
                Color.Transparent,
                Color.White.copy(alpha = 0.16f)
            ),
            start = Offset(0f, 0f),
            end = Offset(800f, 800f)
        )
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(baseFill)
            .border(
                width = 0.8.dp,
                brush = specularGradient,
                shape = RoundedCornerShape(cornerRadius)
            )
            .drawBehind {
                drawRoundRect(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.28f),
                            Color.White.copy(alpha = 0.05f),
                            Color.Transparent
                        )
                    ),
                    topLeft = Offset(0f, 0f),
                    size = size.copy(height = 1.dp.toPx())
                )
            }
    ) {
        content()
    }
}

@Composable
fun AmbientLuminousBackground(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "ambientMesh")
    val driftX by infiniteTransition.animateFloat(
        initialValue = -40f,
        targetValue = 40f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 7500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "driftX"
    )
    val driftY by infiniteTransition.animateFloat(
        initialValue = -25f,
        targetValue = 25f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 10500, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "driftY"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        drawRect(color = Color(0xFF08090C))
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(EthoneViolet.copy(alpha = 0.22f), Color.Transparent),
                center = Offset(size.width * 0.22f + driftX, size.height * 0.18f + driftY),
                radius = size.width * 0.75f
            )
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(EthoneCyan.copy(alpha = 0.16f), Color.Transparent),
                center = Offset(size.width * 0.82f - driftX, size.height * 0.42f - driftY),
                radius = size.width * 0.65f
            )
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(EthoneEmerald.copy(alpha = 0.15f), Color.Transparent),
                center = Offset(size.width * 0.30f + driftY, size.height * 0.82f + driftX),
                radius = size.width * 0.70f
            )
        )
    }
}

@Composable
fun LiquidGlassPill(
    label: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    tint: Color = EthoneEmerald,
    onClick: (() -> Unit)? = null
) {
    val specularGradient = remember {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.35f),
                Color.White.copy(alpha = 0.08f),
                Color.Transparent
            ),
            start = Offset(0f, 0f),
            end = Offset(400f, 400f)
        )
    }

    val clickableMod = if (onClick != null) {
        modifier.clickable { onClick() }
    } else {
        modifier
    }

    Box(
        modifier = clickableMod
            .clip(CircleShape)
            .background(
                Brush.horizontalGradient(
                    colors = listOf(
                        tint.copy(alpha = 0.16f),
                        EthoneBgRaised.copy(alpha = 0.75f)
                    )
                )
            )
            .border(0.8.dp, specularGradient, CircleShape)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (icon != null) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(13.dp)
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(tint)
                )
            }
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}

private fun Color.isLight(): Boolean {
    val luma = (0.299 * red + 0.587 * green + 0.114 * blue)
    return luma > 0.5
}
