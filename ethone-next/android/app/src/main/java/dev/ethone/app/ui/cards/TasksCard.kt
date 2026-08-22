package dev.ethone.app.ui.cards

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import dev.ethone.app.data.SupabaseClient
import dev.ethone.app.ui.components.LiquidGlassSurface
import kotlinx.coroutines.launch

@Composable
fun TasksCard(client: SupabaseClient) {
    val haptic = LocalHapticFeedback.current
    var tasks by remember { mutableStateOf(listOf<Task>()) }
    var newTitle by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        tasks = try {
            client.fetchTasks().map { Task(it.id ?: "", it.title, it.done ?: false) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    LiquidGlassSurface(modifier = Modifier.height(260.dp)) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Tâches",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                TextField(
                    value = newTitle,
                    onValueChange = { newTitle = it },
                    placeholder = { Text("Nouvelle tâche") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                IconButton(
                    onClick = {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        if (newTitle.isNotBlank()) {
                            val list = tasks + Task(System.currentTimeMillis().toString(), newTitle, false)
                            tasks = list
                            newTitle = ""
                        }
                    }
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Ajouter")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(modifier = Modifier.heightIn(max = 120.dp)) {
                items(tasks, key = { it.id }) { task ->
                    TaskRow(
                        task = task,
                        onToggle = {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            tasks = tasks.map {
                                if (it.id == task.id) it.copy(done = !it.done) else it
                            }
                        },
                        onDelete = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            tasks = tasks.filter { it.id != task.id }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskRow(
    task: Task,
    onToggle: () -> Unit,
    onDelete: () -> Unit
) {
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            if (value == SwipeToDismissBoxValue.EndToStart) {
                onDelete()
                true
            } else false
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Row(
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Icon(imageVector = Icons.Default.Delete, contentDescription = "Supprimer")
            }
        }
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Checkbox(
                checked = task.done,
                onCheckedChange = { onToggle() }
            )
            Text(
                text = task.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (task.done) FontWeight.Light else FontWeight.Normal,
                color = if (task.done) MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

data class Task(val id: String, val title: String, val done: Boolean)
