package cloud.passi.streamdek

import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.IOException

class StreamdekClient(private val http: OkHttpClient = OkHttpClient()) {
    interface Listener {
        fun onState(state: ConnectionState)
        fun onCards(cards: List<AgentCard>)
    }

    data class Pairing(val address: String, val token: String)

    private var socket: WebSocket? = null

    fun pair(address: String, code: String, result: (Result<Pairing>) -> Unit): Call {
        val normalized = normalize(address)
        val body = JSONObject().put("code", code).toString()
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder().url("http://$normalized/v1/pair").post(body).build()
        return http.newCall(request).also { call ->
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) = result(Result.failure(e))

                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        val raw = it.body.string()
                        if (!it.isSuccessful) {
                            result(Result.failure(IOException("Pairing failed (${it.code})")))
                            return
                        }
                        runCatching { Pairing(normalized, Protocol.pairingToken(raw)) }.let(result)
                    }
                }
            })
        }
    }

    fun connect(address: String, token: String, listener: Listener) {
        close()
        listener.onState(ConnectionState.Connecting)
        val request = Request.Builder()
            .url("ws://${normalize(address)}/v1/cards")
            .header("Authorization", "Bearer $token")
            .build()
        socket = http.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                listener.onState(ConnectionState.Connected)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                runCatching { Protocol.snapshot(text).cards }
                    .onSuccess(listener::onCards)
                    .onFailure { listener.onState(ConnectionState.Failed(it.message ?: "Invalid server response")) }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                listener.onState(ConnectionState.Failed(t.message ?: "Connection failed"))
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                listener.onState(ConnectionState.Disconnected)
            }
        })
    }

    fun openCard(cardId: String): Boolean = socket?.send(
        JSONObject().put("type", "open").put("cardId", cardId).toString(),
    ) ?: false

    fun close() {
        socket?.close(1000, "Client closed")
        socket = null
    }

    companion object {
        fun normalize(value: String): String {
            val normalized = value.trim()
                .removePrefix("http://")
                .removePrefix("https://")
                .trimEnd('/')
            require(normalized.isNotBlank() && '/' !in normalized) { "Enter a server address and port" }
            return if (':' in normalized) normalized else "$normalized:8910"
        }
    }
}
