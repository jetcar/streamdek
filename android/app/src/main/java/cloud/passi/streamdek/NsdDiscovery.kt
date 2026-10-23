package cloud.passi.streamdek

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import java.io.Closeable
import java.net.InetAddress
import java.util.concurrent.Executor

data class DiscoveredServer(val name: String, val address: String)

class NsdDiscovery(
    context: Context,
    private val found: (DiscoveredServer) -> Unit,
) : Closeable {
    private val manager = context.getSystemService(NsdManager::class.java)
    private val executor = Executor { command -> Handler(Looper.getMainLooper()).post(command) }
    private var running = false

    private val listener = object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(serviceType: String) = Unit
        override fun onDiscoveryStopped(serviceType: String) = Unit
        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) { running = false }
        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) { running = false }
        override fun onServiceLost(serviceInfo: NsdServiceInfo) = Unit
        override fun onServiceFound(serviceInfo: NsdServiceInfo) = resolve(serviceInfo)
    }

    fun start() {
        if (running) return
        running = true
        manager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, listener)
    }

    @Suppress("DEPRECATION")
    private fun resolve(service: NsdServiceInfo) {
        if (Build.VERSION.SDK_INT >= 34) {
            val callback = object : NsdManager.ServiceInfoCallback {
                override fun onServiceInfoCallbackRegistrationFailed(errorCode: Int) = Unit
                override fun onServiceInfoCallbackUnregistered() = Unit
                override fun onServiceLost() = Unit
                override fun onServiceUpdated(serviceInfo: NsdServiceInfo) {
                    serviceInfo.hostAddresses.firstOrNull()?.let { report(serviceInfo, it) }
                    runCatching { manager.unregisterServiceInfoCallback(this) }
                }
            }
            manager.registerServiceInfoCallback(service, executor, callback)
        } else {
            manager.resolveService(service, object : NsdManager.ResolveListener {
                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) = Unit
                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                    serviceInfo.host?.let { report(serviceInfo, it) }
                }
            })
        }
    }

    private fun report(service: NsdServiceInfo, host: InetAddress) {
        val value = host.hostAddress ?: return
        val address = if (':' in value) "[$value]:${service.port}" else "$value:${service.port}"
        found(DiscoveredServer(service.serviceName, address))
    }

    override fun close() {
        if (!running) return
        runCatching { manager.stopServiceDiscovery(listener) }
        running = false
    }

    private companion object {
        const val SERVICE_TYPE = "_streamdek._tcp"
    }
}
