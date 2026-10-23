package cloud.passi.streamdek

data class AgentCard(
    val id: String,
    val title: String,
    val subtitle: String?,
    val status: String,
    val timestamp: Long,
    val source: String,
)

data class Snapshot(
    val protocolVersion: Int,
    val cards: List<AgentCard>,
)

sealed interface ConnectionState {
    data object Disconnected : ConnectionState
    data object Connecting : ConnectionState
    data object Connected : ConnectionState
    data class Failed(val message: String) : ConnectionState
}
