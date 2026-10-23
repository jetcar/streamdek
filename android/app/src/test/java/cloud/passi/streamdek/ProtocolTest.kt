package cloud.passi.streamdek

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ProtocolTest {
    @Test
    fun parsesCardSnapshot() {
        val snapshot = Protocol.snapshot(
            """{"type":"snapshot","protocolVersion":1,"cards":[{"id":"codex:1","title":"streamdek","status":"thinking","timestamp":42,"source":"thread"}]}""",
        )

        assertEquals(1, snapshot.protocolVersion)
        assertEquals("streamdek", snapshot.cards.single().title)
        assertEquals("thinking", snapshot.cards.single().status)
        assertNull(snapshot.cards.single().subtitle)
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsUnknownProtocol() {
        Protocol.snapshot("""{"type":"snapshot","protocolVersion":2,"cards":[]}""")
    }
}
