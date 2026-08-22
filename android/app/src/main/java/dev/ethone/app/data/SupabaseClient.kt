package dev.ethone.app.data

import android.util.Log
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
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

    private val restUrl = "$baseUrl/rest/v1/ethone_items"

    suspend fun fetchTasks(): List<SupabaseItem> = withContext(Dispatchers.IO) {
        try {
            client.get(restUrl) {
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                    append("Accept", "application/vnd.pgrst.object+json")
                }
                url {
                    parameters.append("kind", "eq.task")
                    parameters.append("select", "id,title,done,created_at")
                    parameters.append("order", "created_at.desc")
                }
            }.body()
        } catch (e: Exception) {
            Log.e("SupabaseClient", "fetchTasks error", e)
            emptyList()
        }
    }

    suspend fun fetchNotes(): List<SupabaseItem> = withContext(Dispatchers.IO) {
        try {
            client.get(restUrl) {
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
                url {
                    parameters.append("kind", "eq.note")
                    parameters.append("select", "id,title,body,created_at")
                    parameters.append("order", "created_at.desc")
                }
            }.body()
        } catch (e: Exception) {
            Log.e("SupabaseClient", "fetchNotes error", e)
            emptyList()
        }
    }

    suspend fun addTask(title: String) = withContext(Dispatchers.IO) {
        try {
            client.post(restUrl) {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                    append("Prefer", "return=minimal")
                }
                setBody(
                    SupabaseItem(
                        kind = "task",
                        title = title,
                        done = false
                    )
                )
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "addTask error", e)
        }
    }

    suspend fun toggleTask(id: String, done: Boolean) = withContext(Dispatchers.IO) {
        try {
            client.patch("$restUrl?id=eq.$id") {
                contentType(ContentType.Application.Json)
                headers {
                    append(HttpHeaders.Authorization, "Bearer $anonKey")
                    append("apikey", anonKey)
                }
                setBody(mapOf("done" to done))
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "toggleTask error", e)
        }
    }

    fun close() {
        client.close()
    }
}

@Serializable
data class SupabaseItem(
    val id: String? = null,
    val kind: String,
    val title: String,
    val body: String? = null,
    val done: Boolean? = null,
    val created_at: String? = null
)
