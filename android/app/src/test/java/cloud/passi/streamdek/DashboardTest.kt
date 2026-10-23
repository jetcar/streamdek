package cloud.passi.streamdek

import org.junit.Assert.assertEquals
import org.junit.Test

class DashboardTest {
    @Test
    fun formatsCardAge() {
        val now = 1_000_000_000L
        assertEquals("NOW", relativeAge(now - 10_000, now))
        assertEquals("5M", relativeAge(now - 5 * 60_000, now))
        assertEquals("2H", relativeAge(now - 2 * 60 * 60_000, now))
    }
}
