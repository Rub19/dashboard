package dev.ethone.app.service

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import dev.ethone.app.R

object BiometricPromptManager {

    @Composable
    fun BiometricDialog(
        onAuthenticated: () -> Unit,
        onDismiss: () -> Unit
    ) {
        val context = LocalContext.current
        val canAuth = remember { canAuthenticate(context) }

        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Déverrouiller ETHONE") },
            text = {
                Text(
                    if (canAuth) "Confirmez votre identité avec la biométrie."
                    else "Aucune biométrie disponible sur cet appareil."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (canAuth) {
                            launchPrompt(context as FragmentActivity, onAuthenticated, onDismiss)
                        } else {
                            onDismiss()
                        }
                    }
                ) {
                    Text("Utiliser Face ID / Touch ID")
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) { Text("Annuler") }
            },
            containerColor = MaterialTheme.colorScheme.surface
        )
    }

    private fun canAuthenticate(context: android.content.Context): Boolean {
        val manager = BiometricManager.from(context)
        return manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    private fun launchPrompt(
        activity: FragmentActivity,
        onAuthenticated: () -> Unit,
        onDismiss: () -> Unit
    ) {
        val executor = ContextCompat.getMainExecutor(activity)
        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onAuthenticated()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onDismiss()
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                }
            }
        )

        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(activity.getString(R.string.app_name))
            .setSubtitle("Déverrouillage sécurisé")
            .setDescription("ETHONE utilise votre empreinte digitale ou la reconnaissance faciale.")
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()

        prompt.authenticate(info)
    }
}
