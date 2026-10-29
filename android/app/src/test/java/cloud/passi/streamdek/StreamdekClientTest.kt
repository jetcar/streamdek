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
    fun requestsAndReceivesDesktopApproval() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/v1/access-requests") { exchange ->
            exchange.requestBody.use { it.readBytes() }
            val response = if (exchange.requestMethod == "POST") {
                """{"requestId":"request-1","expiresInSeconds":300}""".toByteArray()
            } else {
                """{"status":"approved","token":"secret","protocolVersion":1}""".toByteArray()
            }
            exchange.sendResponseHeaders(if (exchange.requestMethod == "POST") 202 else 200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            val latch = CountDownLatch(1)
            val client = StreamdekClient()
            var pairing: StreamdekClient.Pairing? = null
            client.requestAccess("127.0.0.1:${server.address.port}", "Pixel") { requested ->
                client.accessStatus(requested.getOrThrow()) {
                    pairing = it.getOrThrow()
                    latch.countDown()
                }
            }
            require(latch.await(5, TimeUnit.SECONDS))
            assertEquals("secret", pairing?.token)
        } finally {
            server.stop(0)
        }
    }
}
