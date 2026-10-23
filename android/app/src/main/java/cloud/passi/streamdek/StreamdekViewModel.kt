package cloud.passi.streamdek

import android.app.Application
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel

data class UiState(
    val address: String = "",
    val code: String = "",
    val connection: ConnectionState = ConnectionState.Disconnected,
    val cards: List<AgentCard> = emptyList(),
    val pairing: Boolean = false,
    val message: String? = null,
)

class StreamdekViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("connection", 0)
    private val client = StreamdekClient()
    private val main = Handler(Looper.getMainLooper())
    private var token: String? = preferences.getString("token", null)
    private var reconnect = true

    var state by mutableStateOf(
        UiState(address = preferences.getString("address", "") ?: ""),
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

    fun updateCode(value: String) {
        state = state.copy(code = value.filter(Char::isDigit).take(6), message = null)
    }

    fun pair() {
        if (state.code.length != 6) {
            state = state.copy(message = "Enter the six-digit code from the desktop log")
            return
        }
        state = state.copy(pairing = true, message = null)
        runCatching {
            client.pair(state.address, state.code) { result ->
                onMain {
                    result.onSuccess {
                        token = it.token
                        preferences.edit().putString("address", it.address).putString("token", it.token).apply()
                        reconnect = true
                        state = state.copy(address = it.address, code = "", pairing = false)
                        connectSaved()
                    }.onFailure {
                        state = state.copy(pairing = false, message = it.message ?: "Pairing failed")
                    }
                }
            }
        }.onFailure {
            state = state.copy(pairing = false, message = it.message ?: "Invalid server address")
        }
    }

    fun open(card: AgentCard) {
        if (!client.openCard(card.id)) state = state.copy(message = "Desktop is not connected")
    }

    fun disconnect() {
        reconnect = false
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
        client.close()
    }
}
