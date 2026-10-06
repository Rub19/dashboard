package dev.ethone.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.ethone.app.data.EthoneFile
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.ui.components.EthoneCard
import dev.ethone.app.ui.components.EthoneEmptyState
import dev.ethone.app.ui.theme.EthoneAmber
import dev.ethone.app.ui.theme.EthoneBgRaised
import dev.ethone.app.ui.theme.EthoneCyan
import dev.ethone.app.ui.theme.EthoneEmerald
import dev.ethone.app.ui.theme.EthonePink
import dev.ethone.app.ui.theme.EthoneRose
import dev.ethone.app.ui.theme.GlassBorder

enum class FileCategoryFilter(val label: String) {
    ALL("Tous"),
    FAVORITES("Favoris"),
    FOLDERS("Dossiers"),
    DOCUMENTS("Documents"),
    MEDIA("Médias")
}

@Composable
fun FilesScreen(
    client: SupabaseClient,
    onBack: (() -> Unit)? = null
) {
    val context = LocalContext.current
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf(FileCategoryFilter.ALL) }

    val rawFiles = client.files

    val filtered = remember(searchQuery, selectedCategory, rawFiles) {
        rawFiles.filter { file ->
            val matchesQuery = searchQuery.isEmpty() || file.name.contains(searchQuery, ignoreCase = true)
            val matchesCategory = when (selectedCategory) {
                FileCategoryFilter.ALL -> true
                FileCategoryFilter.FAVORITES -> file.isFavorite
                FileCategoryFilter.FOLDERS -> file.isFolder
                FileCategoryFilter.DOCUMENTS -> {
                    val m = file.mimeType.lowercase()
                    m.contains("pdf") || m.contains("doc") || m.contains("text") || m.contains("sheet")
                }
                FileCategoryFilter.MEDIA -> {
                    val m = file.mimeType.lowercase()
                    m.startsWith("image/") || m.startsWith("video/") || m.startsWith("audio/")
                }
            }
            matchesQuery && matchesCategory
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Retour")
                }
            }
            Text(
                text = "Fichiers",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.weight(1f))
            Text(
                text = "${rawFiles.size} fichier(s)",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Rechercher un fichier...", fontSize = 14.sp) },
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

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FileCategoryFilter.values().forEach { cat ->
                val isSelected = cat == selectedCategory
                Surface(
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable { selectedCategory = cat },
                    color = if (isSelected) EthoneEmerald.copy(alpha = 0.2f) else EthoneBgRaised.copy(alpha = 0.6f),
                    shape = CircleShape
                ) {
                    Text(
                        text = cat.label,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) EthoneEmerald else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (filtered.isEmpty()) {
            EthoneEmptyState(
                icon = Icons.Default.Folder,
                title = if (rawFiles.isEmpty()) "Aucun fichier synchronisé" else "Aucun résultat",
                description = if (rawFiles.isEmpty()) "Reliez Google Drive depuis ethone.dev pour synchroniser vos fichiers." else "Essayez une autre recherche."
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(filtered, key = { it.id }) { file ->
                    val (icon, tint) = resolveFileVisual(file)

                    EthoneCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    file.webViewLink?.let { link ->
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link))
                                        context.startActivity(intent)
                                    }
                                },
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(tint.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(imageVector = icon, contentDescription = null, tint = tint)
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = file.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        modifier = Modifier.weight(1f, fill = false)
                                    )
                                    if (file.isFavorite) {
                                        Icon(
                                            imageVector = Icons.Default.Star,
                                            contentDescription = "Favori",
                                            tint = EthoneAmber,
                                            modifier = Modifier.size(12.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = file.readableSize,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            if (file.webViewLink != null) {
                                IconButton(
                                    onClick = {
                                        val sendIntent = Intent().apply {
                                            action = Intent.ACTION_SEND
                                            putExtra(Intent.EXTRA_TEXT, "${file.name} : ${file.webViewLink}")
                                            type = "text/plain"
                                        }
                                        context.startActivity(Intent.createChooser(sendIntent, "Partager le lien"))
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Partager",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
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
}

private fun resolveFileVisual(file: EthoneFile): Pair<ImageVector, Color> {
    if (file.isFolder) return Pair(Icons.Default.Folder, EthoneAmber)
    val mime = file.mimeType.lowercase()
    return when {
        mime.contains("pdf") -> Pair(Icons.Default.PictureAsPdf, EthoneRose)
        mime.startsWith("image/") -> Pair(Icons.Default.Image, EthonePink)
        mime.startsWith("video/") -> Pair(Icons.Default.Movie, EthoneCyan)
        else -> Pair(Icons.Default.Description, EthoneEmerald)
    }
}
