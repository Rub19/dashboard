package dev.ethone.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.ui.theme.EthoneBgRaised
import dev.ethone.app.ui.theme.EthoneEmerald

enum class BottomTab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Default.Home),
    Brain("Brain", Icons.Default.AutoAwesome),
    Tasks("Tâches", Icons.Default.CheckCircle),
    Notes("Notes", Icons.Default.Description),
    Files("Fichiers", Icons.Default.Folder),
    Focus("Focus", Icons.Default.Timer),
    Mail("Mail", Icons.Default.Email),
    Settings("Réglages", Icons.Default.Settings)
}

@Composable
fun NativeFloatingDock(
    selectedTab: BottomTab,
    onTabSelected: (BottomTab) -> Unit,
    modifier: Modifier = Modifier
) {
    val haptic = LocalHapticFeedback.current
    val dockTabs = remember {
        listOf(
            BottomTab.Home,
            BottomTab.Brain,
            BottomTab.Tasks,
            BottomTab.Notes,
            BottomTab.Files,
            BottomTab.Settings
        )
    }

    val specularGradient = remember {
        Brush.linearGradient(
            colors = listOf(
                Color.White.copy(alpha = 0.40f),
                Color.White.copy(alpha = 0.08f),
                Color.Transparent,
                Color.White.copy(alpha = 0.16f)
            ),
            start = Offset(0f, 0f),
            end = Offset(800f, 800f)
        )
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clip(RoundedCornerShape(32.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            EthoneBgRaised.copy(alpha = 0.94f),
                            EthoneBgRaised.copy(alpha = 0.82f)
                        )
                    )
                )
                .border(0.8.dp, specularGradient, RoundedCornerShape(32.dp))
                .shadow(24.dp, shape = RoundedCornerShape(32.dp)),
            contentAlignment = Alignment.Center
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp)
            ) {
                dockTabs.forEach { tab ->
                    val selected = tab == selectedTab
                    val iconColor by animateColorAsState(
                        targetValue = if (selected) EthoneEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        label = "tabIconColor"
                    )

                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(18.dp))
                            .background(if (selected) EthoneEmerald.copy(alpha = 0.16f) else Color.Transparent)
                            .border(
                                width = if (selected) 0.6.dp else 0.dp,
                                color = if (selected) EthoneEmerald.copy(alpha = 0.35f) else Color.Transparent,
                                shape = RoundedCornerShape(18.dp)
                            )
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                onTabSelected(tab)
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.label,
                                tint = iconColor,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = tab.label,
                                fontSize = 10.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}
