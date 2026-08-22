package dev.ethone.app.data

import android.util.Log
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.headers
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class SupabaseClient(
    private val baseUrl: String = "https://placeholder.supabase.co",
    private val anonKey: String = "placeholder-anon-key"
) {
    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true })
        }
    }

    private val restUrl = baseUrl

    suspend fun fetchTasks(): List<SupabaseTask> = withContext(Dispatchers.IO) {
        try {
            client.get("$restUrl/rest/v1/tasks") {
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
                url {
                    parameters.append("select", "id,title,description,is_completed,priority,due_date,created_at,updated_at")
                    parameters.append("order", "updated_at.desc.nullslast")
                }
            }.body()
        } catch (e: Exception) {
            Log.e("SupabaseClient", "fetchTasks error", e)
            emptyList()
        }
    }

    suspend fun fetchNotes(): List<SupabaseNote> = withContext(Dispatchers.IO) {
        try {
            client.get("$restUrl/rest/v1/notes") {
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
                url {
                    parameters.append("select", "id,title,body,created_at,updated_at")
                    parameters.append("order", "updated_at.desc.nullslast")
                }
            }.body()
        } catch (e: Exception) {
            Log.e("SupabaseClient", "fetchNotes error", e)
            emptyList()
        }
    }

    suspend fun addTask(title: String, description: String = "") = withContext(Dispatchers.IO) {
        try {
            client.post("$restUrl/rest/v1/tasks") {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                    append("Prefer", "return=minimal")
                }
                setBody(
                    SupabaseTask(
                        title = title,
                        description = description,
                        isCompleted = false
                    )
                )
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "addTask error", e)
        }
    }

    suspend fun addNote(title: String, body: String) = withContext(Dispatchers.IO) {
        try {
            client.post("$restUrl/rest/v1/notes") {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                    append("Prefer", "return=minimal")
                }
                setBody(SupabaseNote(title = title, body = body))
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "addNote error", e)
        }
    }

    suspend fun toggleTask(id: String, done: Boolean) = withContext(Dispatchers.IO) {
        try {
            client.patch("$restUrl/rest/v1/tasks?id=eq.$id") {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
                setBody(mapOf("is_completed" to done))
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "toggleTask error", e)
        }
    }

    suspend fun deleteTask(id: String) = withContext(Dispatchers.IO) {
        try {
            client.delete("$restUrl/rest/v1/tasks?id=eq.$id") {
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "deleteTask error", e)
        }
    }

    fun close() {
        client.close()
    }
}

@Serializable
data class SupabaseTask(
    val id: String? = null,
    val title: String,
    val description: String? = null,
    @SerialName("is_completed") val isCompleted: Boolean? = null,
    val priority: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class SupabaseNote(
    val id: String? = null,
    val title: String,
    val body: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)
