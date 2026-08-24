package dev.ethone.app.ui.cards

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ethone.app.ui.components.LiquidGlassSurface
import dev.ethone.app.ui.theme.EthonePink

@Composable
fun SupportCard() {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val stripeUrl = Uri.parse("https://donate.stripe.com/test_fZu5kD8923u73gn3Bv4Ni00")

    LiquidGlassSurface(modifier = Modifier.height(140.dp)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .clickable {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    CustomTabsIntent.Builder()
                        .build()
                        .launchUrl(context, stripeUrl)
                }
                .padding(16.dp)
        ) {
            Icon(
                imageVector = Icons.Filled.Favorite,
                contentDescription = "Soutenir",
                tint = EthonePink
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Soutenir",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Buy me a coffee",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
