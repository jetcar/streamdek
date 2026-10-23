package cloud.passi.streamdek

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

private val Page = Color(0xFF090C0F)
private val Foreground = Color(0xFFF5F7FA)
private val Muted = Color(0xFF929AA5)

private data class CardTheme(val background: Color, val accent: Color, val label: String)

private fun cardTheme(status: String): CardTheme = when (status) {
    "asking" -> CardTheme(Color(0xFF35101D), Color(0xFFFF4D83), "ASKING")
    "thinking" -> CardTheme(Color(0xFF10243A), Color(0xFF48A8FF), "WORKING")
    "error" -> CardTheme(Color(0xFF351010), Color(0xFFFF5147), "ERROR")
    "scheduled" -> CardTheme(Color(0xFF26153A), Color(0xFFB981FF), "SCHEDULED")
    "done" -> CardTheme(Color(0xFF112D22), Color(0xFF46D68C), "DONE")
    else -> CardTheme(Color(0xFF1E2228), Color(0xFF929AA5), "IDLE")
}

@Composable
fun StreamdekApp(viewModel: StreamdekViewModel) {
    val state = viewModel.state
    MaterialTheme(colorScheme = darkColorScheme(background = Page, surface = Page, onBackground = Foreground)) {
        Column(
            modifier = Modifier.fillMaxSize().background(Page).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Header(state.connection, state.paired, viewModel::disconnect)
            if (!state.paired) {
                PairingPanel(state, viewModel::updateAddress, viewModel::updateCode, viewModel::pair)
            } else if (state.cards.isEmpty()) {
                EmptyState(state.connection)
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(108.dp),
                    modifier = Modifier.fillMaxSize(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(state.cards, key = AgentCard::id) { card -> AgentCardView(card) { viewModel.open(card) } }
                }
            }
            state.message?.let { Text(it, color = Color(0xFFFF8A80), fontSize = 13.sp) }
        }
    }
}

@Composable
private fun Header(connection: ConnectionState, paired: Boolean, disconnect: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text("STREAMDEK", color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.weight(1f))
        val color = when (connection) {
            ConnectionState.Connected -> Color(0xFF46D68C)
            ConnectionState.Connecting -> Color(0xFF48A8FF)
            is ConnectionState.Failed -> Color(0xFFFF5147)
            ConnectionState.Disconnected -> Muted
        }
        Box(Modifier.size(9.dp).background(color, CircleShape))
        if (paired) {
            Text("  DISCONNECT", modifier = Modifier.clickable(onClick = disconnect), color = Muted, fontSize = 11.sp)
        }
    }
}

@Composable
private fun PairingPanel(state: UiState, address: (String) -> Unit, code: (String) -> Unit, pair: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Connect to the desktop service on the same Wi‑Fi network.", color = Muted)
        OutlinedTextField(
            value = state.address,
            onValueChange = address,
            label = { Text("Desktop address") },
            placeholder = { Text("192.168.1.20:8910") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = state.code,
            onValueChange = code,
            label = { Text("Pairing code") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = pair,
            enabled = !state.pairing,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF48A8FF)),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (state.pairing) CircularProgressIndicator(Modifier.size(22.dp), color = Page, strokeWidth = 2.dp)
            else Text("PAIR", color = Page, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun EmptyState(connection: ConnectionState) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            if (connection == ConnectionState.Connected) "No recent sessions" else "Connecting to desktop…",
            color = Muted,
        )
    }
}

@Composable
private fun AgentCardView(card: AgentCard, open: () -> Unit) {
    val theme = cardTheme(card.status)
    Column(
        modifier = Modifier
            .aspectRatio(1f)
            .background(theme.background, RoundedCornerShape(12.dp))
            .border(2.dp, theme.accent, RoundedCornerShape(12.dp))
            .clickable(onClick = open)
            .padding(10.dp),
    ) {
        Text(theme.label, color = theme.accent, fontSize = 10.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(5.dp))
        Text(card.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
        card.subtitle?.let {
            Text(it, color = Foreground.copy(alpha = 0.78f), fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
        Spacer(Modifier.weight(1f))
        Row(Modifier.fillMaxWidth()) {
            Text(if (card.source == "claude") "CLAUDE" else "", color = theme.accent, fontSize = 9.sp)
            Spacer(Modifier.weight(1f))
            Text(relativeAge(card.timestamp), color = Muted, fontSize = 9.sp)
        }
    }
}

internal fun relativeAge(timestamp: Long, now: Long = System.currentTimeMillis()): String {
    val minutes = abs(now - timestamp) / 60_000.0
    return when {
        minutes < 1 -> "NOW"
        minutes < 60 -> "${minutes.roundToInt()}M"
        minutes < 1_440 -> "${(minutes / 60).roundToInt()}H"
        else -> String.format(Locale.ROOT, "%dD", (minutes / 1_440).roundToInt())
    }
}
