package dev.ethone.app.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.FormatListBulleted
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
import kotlinx.coroutines.launch

enum class FileCategoryFilter(val label: String) {
    ALL("Tous"),
    FAVORITES("Favoris"),
    FOLDERS("Dossiers"),
    DOCUMENTS("Documents"),
    MEDIA("Médias")
}

enum class FileViewMode {
    LIST,
    GRID
}

@Composable
fun FilesScreen(
    client: SupabaseClient,
    onBack: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf(FileCategoryFilter.ALL) }
    var viewMode by remember { mutableStateOf(FileViewMode.LIST) }
    var folderPath by remember { mutableStateOf(listOf<EthoneFile>()) }
    var inspectingFile by remember { mutableStateOf<EthoneFile?>(null) }
    var isRefreshing by remember { mutableStateOf(false) }

    val rawFiles = client.files
    val currentFolder = folderPath.lastOrNull()

    val filtered = remember(searchQuery, selectedCategory, rawFiles, folderPath) {
        rawFiles.filter { file ->
            val matchesQuery = searchQuery.isEmpty() || file.name.contains(searchQuery, ignoreCase = true)
            val matchesCategory = when (selectedCategory) {
                FileCategoryFilter.ALL -> {
                    if (searchQuery.isNotEmpty()) true
                    else {
                        if (currentFolder == null) file.parentId == null || rawFiles.none { it.id == file.parentId }
                        else file.parentId == currentFolder.id
                    }
                }
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

            IconButton(
                onClick = {
                    viewMode = if (viewMode == FileViewMode.LIST) FileViewMode.GRID else FileViewMode.LIST
                }
            ) {
                Icon(
                    imageVector = if (viewMode == FileViewMode.LIST) Icons.Default.GridView else Icons.Default.FormatListBulleted,
                    contentDescription = "Changer de vue",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            IconButton(
                onClick = {
                    if (!isRefreshing) {
                        isRefreshing = true
                        scope.launch {
                            client.refreshAll()
                            isRefreshing = false
                        }
                    }
                }
            ) {
                if (isRefreshing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = EthoneEmerald
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Actualiser",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        if (folderPath.isNotEmpty() && selectedCategory == FileCategoryFilter.ALL && searchQuery.isEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = EthoneBgRaised,
                    modifier = Modifier.clickable { folderPath = emptyList() }
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Home, contentDescription = null, modifier = Modifier.size(14.dp), tint = EthoneEmerald)
                        Text("Racine", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                }

                folderPath.forEachIndexed { index, folder ->
                    Icon(imageVector = Icons.Default.ChevronRight, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = if (index == folderPath.lastIndex) EthoneEmerald.copy(alpha = 0.15f) else EthoneBgRaised,
                        modifier = Modifier.clickable {
                            folderPath = folderPath.take(index + 1)
                        }
                    ) {
                        Text(
                            text = folder.name,
                            fontSize = 12.sp,
                            fontWeight = if (index == folderPath.lastIndex) FontWeight.Bold else FontWeight.Medium,
                            color = if (index == folderPath.lastIndex) EthoneEmerald else MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Rechercher un fichier...", fontSize = 14.sp) },
            leadingIcon = {
                Icon(imageVector = Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Effacer", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
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
                description = if (rawFiles.isEmpty()) "Reliez Google Drive depuis ethone.dev pour synchroniser vos fichiers." else "Essayez une autre catégorie ou terme de recherche."
            )
        } else if (viewMode == FileViewMode.LIST) {
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
                                    if (file.isFolder) {
                                        folderPath = folderPath + file
                                    } else {
                                        inspectingFile = file
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
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = file.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.weight(1f, fill = false)
                                    )
                                }
                                Text(
                                    text = file.readableSize,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            IconButton(
                                onClick = {
                                    scope.launch {
                                        client.toggleFavoriteFile(file.id, !file.isFavorite)
                                    }
                                },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = if (file.isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                                    contentDescription = "Favori",
                                    tint = if (file.isFavorite) EthoneAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(18.dp)
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
                                    },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Share,
                                        contentDescription = "Partager",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(18.dp)
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
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(bottom = 100.dp),
                modifier = Modifier.weight(1f)
            ) {
                items(filtered, key = { it.id }) { file ->
                    val (icon, tint) = resolveFileVisual(file)

                    EthoneCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (file.isFolder) {
                                    folderPath = folderPath + file
                                } else {
                                    inspectingFile = file
                                }
                            }
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(tint.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
                                }

                                IconButton(
                                    onClick = {
                                        scope.launch {
                                            client.toggleFavoriteFile(file.id, !file.isFavorite)
                                        }
                                    },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        imageVector = if (file.isFavorite) Icons.Default.Star else Icons.Default.StarBorder,
                                        contentDescription = "Favori",
                                        tint = if (file.isFavorite) EthoneAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }

                            Text(
                                text = file.name,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )

                            Text(
                                text = file.readableSize,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }

    inspectingFile?.let { file ->
        val (icon, tint) = resolveFileVisual(file)
        AlertDialog(
            onDismissRequest = { inspectingFile = null },
            title = {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(tint.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(imageVector = icon, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
                    }
                    Text(
                        text = file.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Divider(color = GlassBorder)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Taille", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(file.readableSize, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Type MIME", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(file.mimeType.ifBlank { "Inconnu" }, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                    }
                    if (file.updatedAt != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Dernière mise à jour", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(file.updatedAt.take(10), fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (file.webViewLink != null) {
                            TextButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(file.webViewLink))
                                    context.startActivity(intent)
                                    inspectingFile = null
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(imageVector = Icons.Default.OpenInBrowser, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.size(4.dp))
                                Text("Ouvrir", fontSize = 13.sp)
                            }

                            TextButton(
                                onClick = {
                                    val sendIntent = Intent().apply {
                                        action = Intent.ACTION_SEND
                                        putExtra(Intent.EXTRA_TEXT, "${file.name} : ${file.webViewLink}")
                                        type = "text/plain"
                                    }
                                    context.startActivity(Intent.createChooser(sendIntent, "Partager le lien"))
                                    inspectingFile = null
                                },
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(imageVector = Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.size(4.dp))
                                Text("Partager", fontSize = 13.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { inspectingFile = null }) {
                    Text("Fermer")
                }
            }
        )
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
