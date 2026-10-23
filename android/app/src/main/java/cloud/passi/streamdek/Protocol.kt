package cloud.passi.streamdek

import org.json.JSONObject

object Protocol {
    const val VERSION = 1

    fun snapshot(raw: String): Snapshot {
        val root = JSONObject(raw)
        require(root.getString("type") == "snapshot") { "Unsupported message type" }
        val version = root.getInt("protocolVersion")
        require(version == VERSION) { "Unsupported protocol version $version" }
        val values = root.getJSONArray("cards")
        val cards = buildList {
            for (index in 0 until values.length()) {
                val value = values.getJSONObject(index)
                add(
                    AgentCard(
                        id = value.getString("id"),
                        title = value.getString("title"),
                        subtitle = value.optString("subtitle").ifBlank { null },
                        status = value.getString("status"),
                        timestamp = value.getLong("timestamp"),
                        source = value.getString("source"),
                    ),
                )
            }
        }
        return Snapshot(version, cards)
    }

    fun pairingToken(raw: String): String {
        val value = JSONObject(raw)
        require(value.getInt("protocolVersion") == VERSION) { "Unsupported protocol version" }
        return value.getString("token")
    }
}
