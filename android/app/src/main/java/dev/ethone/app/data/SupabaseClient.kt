package dev.ethone.app.data

import android.content.Context
import android.util.Base64
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.headers
import io.ktor.client.request.request
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/** Configuration publique : la clé « anon » de Supabase est publique par conception (servie dans le JavaScript du site), l'accès est protégé par la RLS. */
object SupabaseConfig {
    const val URL = "https://bvgifyzhpzkbrwdjrqsg.supabase.co"
    const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Z2lmeXpocHprYnJ3ZGpycXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODgzNjAsImV4cCI6MjA5NjE2NDM2MH0.PCm_g4w7ZrLqNilISt-Xnlw_CZrA8PY1Uvk9H_PUhCc"
}

/** Tâche telle qu'affichée par l'interface (table `tasks`, la même que la page Tâches du site). */
data class EthoneTask(val id: String, val title: String, val done: Boolean)

/** Note telle qu'affichée par l'interface (table `ethone_items`, kind = note, la même que le site). */
data class EthoneNote(val id: String, val title: String, val body: String)

/**
 * Client Supabase de l'app : connexion e-mail / mot de passe, session conservée sur l'appareil, notes et tâches réelles du compte.
 * Sans session, la base ne renvoie rien (règles RLS) : l'écran de connexion est donc affiché avant toute donnée.
 */
class SupabaseClient(
    context: Context? = null,
    private val baseUrl: String = SupabaseConfig.URL,
    private val anonKey: String = SupabaseConfig.ANON_KEY
) {
    private val prefs = context?.getSharedPreferences("ethone_session", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val client = HttpClient(OkHttp) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true; isLenient = true })
        }
    }

    var accessToken by mutableStateOf<String?>(prefs?.getString("access", null))
        private set
    private var refreshToken: String? = prefs?.getString("refresh", null)

    var tasks by mutableStateOf(listOf<EthoneTask>())
        private set
    var notes by mutableStateOf(listOf<EthoneNote>())
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    val isSignedIn: Boolean get() = accessToken != null

    // region Session

    /** Renvoie `null` si la connexion réussit, sinon le message à afficher. */
    suspend fun signIn(email: String, password: String): String? = withContext(Dispatchers.IO) {
        try {
            val response = client.request("$baseUrl/auth/v1/token") {
                method = HttpMethod.Post
                url { parameters.append("grant_type", "password") }
                headers { append("apikey", anonKey) }
                contentType(ContentType.Application.Json)
                setBody(buildJsonObject { put("email", email); put("password", password) } as JsonElement)
            }
            if (!response.status.isSuccess()) return@withContext "E-mail ou mot de passe incorrect."
            applySession(json.parseToJsonElement(response.bodyAsText()).jsonObject)
            null
        } catch (e: Exception) {
            Log.e("SupabaseClient", "signIn error", e)
            "Connexion impossible : vérifiez votre réseau."
        }
    }

    fun signOut() {
        accessToken = null
        refreshToken = null
        tasks = emptyList()
        notes = emptyList()
        prefs?.edit()?.clear()?.apply()
    }

    private fun applySession(session: JsonObject) {
        val access = session["access_token"]?.jsonPrimitive?.content ?: return
        val refresh = session["refresh_token"]?.jsonPrimitive?.content
        accessToken = access
        refreshToken = refresh
        prefs?.edit()?.putString("access", access)?.putString("refresh", refresh)?.apply()
    }

    private suspend fun refreshSession(): Boolean {
        val token = refreshToken ?: return false
        return try {
            val response = client.request("$baseUrl/auth/v1/token") {
                method = HttpMethod.Post
                url { parameters.append("grant_type", "refresh_token") }
                headers { append("apikey", anonKey) }
                contentType(ContentType.Application.Json)
                setBody(buildJsonObject { put("refresh_token", token) } as JsonElement)
            }
            if (!response.status.isSuccess()) {
                signOut()
                false
            } else {
                applySession(json.parseToJsonElement(response.bodyAsText()).jsonObject)
                true
            }
        } catch (e: Exception) {
            Log.e("SupabaseClient", "refresh error", e)
            false
        }
    }

    /** Identifiant de l'utilisateur, lu dans le jeton (champ `sub`) : requis par la RLS à l'insertion. */
    private fun userId(): String? {
        val part = accessToken?.split(".")?.getOrNull(1) ?: return null
        return try {
            val decoded = String(Base64.decode(part, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP))
            json.parseToJsonElement(decoded).jsonObject["sub"]?.jsonPrimitive?.content
        } catch (e: Exception) {
            null
        }
    }

    // endregion

    // region Réseau

    private suspend fun call(
        method: HttpMethod,
        path: String,
        params: Map<String, String> = emptyMap(),
        body: JsonElement? = null,
        prefer: String? = null
    ): HttpResponse {
        suspend fun once(): HttpResponse = client.request("$baseUrl$path") {
            this.method = method
            headers {
                append("apikey", anonKey)
                append(HttpHeaders.Authorization, "Bearer ${accessToken ?: anonKey}")
                if (prefer != null) append("Prefer", prefer)
            }
            url { params.forEach { (key, value) -> parameters.append(key, value) } }
            if (body != null) {
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }

        var response = once()
        if (response.status == HttpStatusCode.Unauthorized && refreshSession()) response = once()
        return response
    }

    // endregion

    // region Données

    suspend fun refreshAll() = withContext(Dispatchers.IO) {
        if (!isSignedIn) return@withContext
        try {
            val taskRows = call(
                HttpMethod.Get, "/rest/v1/tasks",
                mapOf("select" to "id,title,is_completed", "order" to "updated_at.desc")
            )
            if (taskRows.status.isSuccess()) {
                tasks = (json.parseToJsonElement(taskRows.bodyAsText()) as? JsonArray).orEmpty().map { row ->
                    val o = row.jsonObject
                    EthoneTask(
                        id = o["id"]?.jsonPrimitive?.content.orEmpty(),
                        title = o["title"]?.jsonPrimitive?.content.orEmpty(),
                        done = (o["is_completed"] as? JsonPrimitive)?.boolean ?: false
                    )
                }
            }

            val noteRows = call(
                HttpMethod.Get, "/rest/v1/ethone_items",
                mapOf("select" to "id,title,body", "kind" to "eq.note", "order" to "updated_at.desc")
            )
            if (noteRows.status.isSuccess()) {
                notes = (json.parseToJsonElement(noteRows.bodyAsText()) as? JsonArray).orEmpty().map { row ->
                    val o = row.jsonObject
                    EthoneNote(
                        id = o["id"]?.jsonPrimitive?.content.orEmpty(),
                        title = o["title"]?.jsonPrimitive?.content.orEmpty(),
                        // Le site enregistre le corps des notes en HTML (éditeur riche) : on n'affiche que le texte.
                        body = (o["body"] as? JsonPrimitive)?.contentOrNull().orEmpty().replace(Regex("<[^>]+>"), " ").replace(Regex("\\s+"), " ").trim()
                    )
                }
            }
            errorMessage = null
        } catch (e: Exception) {
            Log.e("SupabaseClient", "refreshAll error", e)
            errorMessage = "Synchronisation impossible."
        }
    }

    suspend fun createTask(title: String) = withContext(Dispatchers.IO) {
        val user = userId() ?: return@withContext
        try {
            call(
                HttpMethod.Post, "/rest/v1/tasks",
                body = buildJsonObject { put("title", title); put("is_completed", false); put("user_id", user) },
                prefer = "return=minimal"
            )
        } catch (e: Exception) {
            Log.e("SupabaseClient", "createTask error", e)
        }
        refreshAll()
    }

    suspend fun toggleTask(id: String, done: Boolean) = withContext(Dispatchers.IO) {
        // Mise à jour immédiate de l'interface, puis écriture ; l'état serveur remplace de toute façon la liste ensuite.
        tasks = tasks.map { if (it.id == id) it.copy(done = done) else it }
        try {
            call(HttpMethod.Patch, "/rest/v1/tasks", mapOf("id" to "eq.$id"), buildJsonObject { put("is_completed", done) })
        } catch (e: Exception) {
            Log.e("SupabaseClient", "toggleTask error", e)
        }
        refreshAll()
    }

    suspend fun deleteTask(id: String) = withContext(Dispatchers.IO) {
        tasks = tasks.filterNot { it.id == id }
        try {
            call(HttpMethod.Delete, "/rest/v1/tasks", mapOf("id" to "eq.$id"))
        } catch (e: Exception) {
            Log.e("SupabaseClient", "deleteTask error", e)
        }
        refreshAll()
    }

    suspend fun createNote(title: String, body: String) = withContext(Dispatchers.IO) {
        val user = userId() ?: return@withContext
        try {
            call(
                HttpMethod.Post, "/rest/v1/ethone_items",
                body = buildJsonObject { put("kind", "note"); put("title", title); put("body", body); put("user_id", user) },
                prefer = "return=minimal"
            )
        } catch (e: Exception) {
            Log.e("SupabaseClient", "createNote error", e)
        }
        refreshAll()
    }

    suspend fun deleteNote(id: String) = withContext(Dispatchers.IO) {
        notes = notes.filterNot { it.id == id }
        try {
            call(HttpMethod.Delete, "/rest/v1/ethone_items", mapOf("id" to "eq.$id"))
        } catch (e: Exception) {
            Log.e("SupabaseClient", "deleteNote error", e)
        }
        refreshAll()
    }

    /** Compatibilité avec les cartes qui affichent un aperçu des tâches. */
    suspend fun fetchTasks(): List<SupabaseTask> {
        refreshAll()
        return tasks.map { SupabaseTask(id = it.id, title = it.title, isCompleted = it.done) }
    }

    // endregion

    fun close() {
        client.close()
    }
}

private fun JsonPrimitive.contentOrNull(): String? = if (isString || content != "null") content else null

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
