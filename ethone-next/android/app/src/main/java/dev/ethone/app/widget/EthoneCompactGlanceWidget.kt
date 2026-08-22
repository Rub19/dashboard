package dev.ethone.app.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import dev.ethone.app.MainActivity

class EthoneCompactGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { CompactContent() }
    }

    @Composable
    private fun CompactContent() {
        val primary = ColorProvider(Color(0xFF1A1A2E))
        val onPrimary = ColorProvider(Color(0xFFFFFFFF))

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(primary)
                .cornerRadius(16.dp)
                .padding(12.dp)
                .clickable(actionStartActivity<MainActivity>()),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "3",
                    style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, color = onPrimary)
                )
                Text(
                    text = "tâches",
                    style = TextStyle(fontSize = 12.sp, color = onPrimary)
                )
            }
        }
    }
}

class EthoneCompactGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = EthoneCompactGlanceWidget()
}
