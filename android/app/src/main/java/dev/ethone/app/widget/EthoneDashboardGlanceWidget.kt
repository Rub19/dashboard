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
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import dev.ethone.app.MainActivity

class EthoneDashboardGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { DashboardContent() }
    }

    @Composable
    private fun DashboardContent() {
        val primary = ColorProvider(day = Color(0xFF1A1A2E), night = Color(0xFF1A1A2E))
        val onPrimary = ColorProvider(day = Color(0xFFFFFFFF), night = Color(0xFFFFFFFF))

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(primary)
                .cornerRadius(16.dp)
                .padding(12.dp)
                .clickable(actionStartActivity<MainActivity>())
        ) {
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "ETHONE",
                    style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = onPrimary)
                )
                Spacer(GlanceModifier.height(8.dp))
                Text(
                    text = "En ligne",
                    style = TextStyle(fontSize = 12.sp, color = onPrimary)
                )
            }
            Spacer(GlanceModifier.height(12.dp))
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "☀",
                    style = TextStyle(fontSize = 24.sp, color = onPrimary)
                )
                Spacer(GlanceModifier.height(8.dp))
                Column {
                    Text(
                        text = "18°C",
                        style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = onPrimary)
                    )
                    Text(
                        text = "Ensoleillé",
                        style = TextStyle(fontSize = 12.sp, color = onPrimary)
                    )
                }
            }
            Spacer(GlanceModifier.height(12.dp))
            Box(
                modifier = GlanceModifier.fillMaxSize().background(ColorProvider(day = Color(0x33000000), night = Color(0x33000000))).cornerRadius(8.dp).padding(8.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Text(
                    text = "Note : idée Brain → matérialiser",
                    style = TextStyle(fontSize = 13.sp, color = onPrimary)
                )
            }
        }
    }
}

class EthoneDashboardGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = EthoneDashboardGlanceWidget()
}
