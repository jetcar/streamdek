package cloud.passi.streamdek

import android.app.Application
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel

data class UiState(
    val address: String = "",
    val connection: ConnectionState = ConnectionState.Disconnected,
    val cards: List<AgentCard> = emptyList(),
    val pairing: Boolean = false,
    val message: String? = null,
    val paired: Boolean = false,
    val discovered: List<DiscoveredServer> = emptyList(),
)

class StreamdekViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("connection", 0)
    private val client = StreamdekClient()
    private val discovery = NsdDiscovery(application) { server ->
        onMain {
            state = state.copy(discovered = (state.discovered + server).distinctBy(DiscoveredServer::address))
        }
    }
    private val main = Handler(Looper.getMainLooper())
    private var token: String? = preferences.getString("token", null)
    private var reconnect = true

    var state by mutableStateOf(
        UiState(address = preferences.getString("address", "") ?: "", paired = token != null),
    )
        private set

    private val listener = object : StreamdekClient.Listener {
        override fun onState(state: ConnectionState) = onMain {
            this@StreamdekViewModel.state = this@StreamdekViewModel.state.copy(
                connection = state,
                message = (state as? ConnectionState.Failed)?.message,
            )
            if (state is ConnectionState.Failed && reconnect && token != null) {
                main.postDelayed({ connectSaved() }, 3_000)
            }
        }

        override fun onCards(cards: List<AgentCard>) = onMain {
            state = state.copy(cards = cards, message = null)
        }
    }

    init {
        if (state.address.isNotBlank() && token != null) connectSaved()
    }

    fun updateAddress(value: String) {
        state = state.copy(address = value, message = null)
    }

    fun startDiscovery() = runCatching { discovery.start() }
        .onFailure { state = state.copy(message = "LAN discovery unavailable: ${it.message}") }

    fun selectServer(server: DiscoveredServer) {
        state = state.copy(address = server.address, message = null)
    }

    fun requestAccess() {
        state = state.copy(pairing = true, message = null)
        runCatching {
            client.requestAccess(state.address, "${Build.MANUFACTURER} ${Build.MODEL}".trim()) { result ->
                onMain {
                    result.onSuccess { request ->
                        state = state.copy(address = request.address, message = "Waiting for approval on the desktop…")
                        pollAccess(request)
                    }.onFailure {
                        state = state.copy(pairing = false, message = it.message ?: "Access request failed")
                    }
                }
            }
        }.onFailure {
            state = state.copy(pairing = false, message = it.message ?: "Invalid server address")
        }
    }

    private fun pollAccess(request: StreamdekClient.AccessRequest) {
        client.accessStatus(request) { result ->
            onMain {
                result.onSuccess { pairing ->
                    if (pairing == null) {
                        if (state.pairing) main.postDelayed({ pollAccess(request) }, 1_000)
                    } else {
                        token = pairing.token
                        preferences.edit().putString("address", pairing.address).putString("token", pairing.token).apply()
                        reconnect = true
                        state = state.copy(address = pairing.address, pairing = false, paired = true, message = null)
                        connectSaved()
                    }
                }.onFailure {
                    state = state.copy(pairing = false, message = it.message ?: "Approval failed")
                }
            }
        }
    }

    fun open(card: AgentCard) {
        if (!client.openCard(card.id)) state = state.copy(message = "Desktop is not connected")
    }

    fun disconnect() {
        reconnect = false
        state = state.copy(pairing = false)
        main.removeCallbacksAndMessages(null)
        token = null
        preferences.edit().clear().apply()
        client.close()
        state = UiState(address = state.address)
    }

    private fun connectSaved() {
        val savedToken = token ?: return
        runCatching { client.connect(state.address, savedToken, listener) }
            .onFailure { state = state.copy(connection = ConnectionState.Failed(it.message ?: "Connection failed")) }
    }

    private fun onMain(action: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) action() else main.post(action)
    }

    override fun onCleared() {
        reconnect = false
        main.removeCallbacksAndMessages(null)
        discovery.close()
        client.close()
    }
}
