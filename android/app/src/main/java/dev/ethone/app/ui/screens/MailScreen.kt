package dev.ethone.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.ui.components.EthoneCard
import dev.ethone.app.ui.components.EthoneEmptyState
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthoneViolet
import dev.ethone.app.ui.theme.GlassBorder
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID

data class MailItem(
    val id: String = UUID.randomUUID().toString(),
    val sender: String,
    val subject: String,
    val snippet: String,
    val time: String,
    var isUnread: Boolean = false
)

@Composable
fun MailScreen() {
    val messages = remember {
        mutableStateListOf(
            MailItem(sender = "GitHub", subject = "[ETHONE] Build & Deploy Cloudflare Worker", snippet = "Le build v1.11.00 est en ligne sur production...", time = "18:42", isUnread = true),
            MailItem(sender = "Supabase Alert", subject = "Statut de la base de données", snippet = "Votre quota de base de données est optimal à 1.2% d'utilisation.", time = "Hier", isUnread = false),
            MailItem(sender = "Spotify Developer", subject = "Confirmation des accès PKCE", snippet = "Vos identifiants d'API Spotify sont prêts pour votre instance.", time = "24 août", isUnread = false)
        )
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedMail by remember { mutableStateOf<MailItem?>(null) }
    var brainSummary by remember { mutableStateOf<String?>(null) }
    var isSummarizing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val filtered = remember(searchQuery, messages.size) {
        if (searchQuery.isEmpty()) messages
        else messages.filter {
            it.sender.contains(searchQuery, ignoreCase = true) ||
            it.subject.contains(searchQuery, ignoreCase = true) ||
            it.snippet.contains(searchQuery, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        // Search
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Rechercher dans les mails...", fontSize = 14.sp) },
            leadingIcon = {
                Icon(imageVector = Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            },
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp)),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = EthoneEmerald,
                unfocusedBorderColor = GlassBorder,
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent
            ),
            shape = RoundedCornerShape(16.dp),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (filtered.isEmpty()) {
            EthoneEmptyState(
                icon = Icons.Default.Email,
                title = "Boîte de réception vide",
                description = "Tous vos e-mails ont été traités."
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filtered) { msg ->
                    EthoneCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                msg.isUnread = false
                                brainSummary = null
                                selectedMail = msg
                            }
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .padding(top = 4.dp)
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (msg.isUnread) EthoneEmerald else Color.Transparent)
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(
                                        text = msg.sender,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = if (msg.isUnread) FontWeight.Bold else FontWeight.Medium
                                    )
                                    Text(
                                        text = msg.time,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Text(
                                    text = msg.subject,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (msg.isUnread) FontWeight.SemiBold else FontWeight.Normal,
                                    maxLines = 1
                                )

                                Text(
                                    text = msg.snippet,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 2
                                )
                            }

                            IconButton(
                                onClick = { messages.remove(msg) },
                                modifier = Modifier.size(20.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = "Supprimer",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
                item {
                    Spacer(modifier = Modifier.height(100.dp))
                }
            }
        }
    }

    selectedMail?.let { mail ->
        AlertDialog(
            onDismissRequest = { selectedMail = null },
            title = { Text(mail.subject, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = "De : ${mail.sender}", fontSize = 13.sp, color = EthoneEmerald, fontWeight = FontWeight.Bold)

                    if (brainSummary != null) {
                        Surface(
                            color = EthoneViolet.copy(alpha = 0.12f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Icon(imageVector = Icons.Default.AutoAwesome, contentDescription = null, tint = EthoneViolet, modifier = Modifier.size(14.dp))
                                    Text("Résumé IA Brain", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = EthoneViolet)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(brainSummary ?: "", fontSize = 12.sp)
                            }
                        }
                    } else {
                        Button(
                            onClick = {
                                isSummarizing = true
                                scope.launch {
                                    delay(600)
                                    brainSummary = "Message clé : Confirmation de bon fonctionnement des services. Aucune urgence."
                                    isSummarizing = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EthoneViolet.copy(alpha = 0.2f)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            if (isSummarizing) {
                                CircularProgressIndicator(color = EthoneViolet, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(imageVector = Icons.Default.AutoAwesome, contentDescription = null, tint = EthoneViolet)
                                Spacer(modifier = Modifier.size(6.dp))
                                Text("Résumer avec Brain", color = EthoneViolet, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Text(text = mail.snippet, fontSize = 14.sp, color = MaterialTheme.colorScheme.onBackground)
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedMail = null }) {
                    Text("Fermer")
                }
            }
        )
    }
}
