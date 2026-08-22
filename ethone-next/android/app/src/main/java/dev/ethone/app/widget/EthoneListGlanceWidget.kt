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

class EthoneListGlanceWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { ListContent() }
    }

    @Composable
    private fun ListContent() {
        val primary = ColorProvider(Color(0xFF1A1A2E))
        val onPrimary = ColorProvider(Color(0xFFFFFFFF))

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(primary)
                .cornerRadius(16.dp)
                .padding(12.dp)
                .clickable(actionStartActivity<MainActivity>())
        ) {
            Text(
                text = "Prioritaires",
                style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp, color = onPrimary)
            )
            Spacer(GlanceModifier.height(8.dp))
            listOf("Finaliser le design", "Revue code", "Envoyer le build").forEach { task ->
                Row(
                    modifier = GlanceModifier.fillMaxWidth().padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "☐",
                        style = TextStyle(fontSize = 14.sp, color = onPrimary)
                    )
                    Spacer(GlanceModifier.height(8.dp))
                    Text(
                        text = task,
                        style = TextStyle(fontSize = 13.sp, color = onPrimary)
                    )
                }
            }
        }
    }
}

class EthoneListGlanceWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = EthoneListGlanceWidget()
}
