package cloud.passi.streamdek

import com.sun.net.httpserver.HttpServer
import org.junit.Assert.assertEquals
import org.junit.Test
import java.net.InetSocketAddress
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class StreamdekClientTest {
    @Test
    fun normalizesDesktopAddress() {
        assertEquals("192.168.1.4:8910", StreamdekClient.normalize("http://192.168.1.4:8910/"))
        assertEquals("desktop.local:8910", StreamdekClient.normalize("desktop.local"))
    }

    @Test
    fun pairsWithDesktopServer() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/v1/pair") { exchange ->
            exchange.requestBody.use { it.readBytes() }
            val response = """{"token":"secret","protocolVersion":1}""".toByteArray()
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            val latch = CountDownLatch(1)
            var pairing: StreamdekClient.Pairing? = null
            StreamdekClient().pair("127.0.0.1:${server.address.port}", "123456") {
                pairing = it.getOrThrow()
                latch.countDown()
            }
            require(latch.await(5, TimeUnit.SECONDS))
            assertEquals("secret", pairing?.token)
        } finally {
            server.stop(0)
        }
    }
}
