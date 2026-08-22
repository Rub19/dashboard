package dev.ethone.app

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import dev.ethone.app.service.LocalNotificationManager
import dev.ethone.app.ui.screens.BentoGridScreen
import dev.ethone.app.ui.theme.EthoneTheme

class MainActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        LocalNotificationManager.initContext(this)
        LocalNotificationManager.createChannels(this)

        setContent {
            EthoneTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    BentoGridScreen()
                }
            }
        }
    }
}
