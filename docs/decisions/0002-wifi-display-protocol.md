# ADR 0002: Authenticated local Wi-Fi display protocol

## Status

Accepted

## Decision

Expose card snapshots from the desktop service over an authenticated WebSocket and advertise the endpoint with DNS-SD. Pair Android clients with a six-digit code for compatibility. Browser displays instead create a five-minute access request; Streamdek notifies the desktop, opens a loopback-only approval page there, and releases the retained random bearer token only after approval. Browsers pass that token in the WebSocket URL because the browser WebSocket API cannot set an `Authorization` header. Serve the browser dashboard from the same local HTTP service so it needs no separate hosting or installation. Send structured card data rather than rendered images, and keep task targets only on the desktop.

Use cleartext HTTP and WebSocket transport for the first LAN release. Restrict intended use to trusted private networks and revisit certificate-pinned TLS before supporting untrusted networks or remote access.

## Context

The existing collectors, card ordering, and task-opening logic already run on the desktop. Android and arbitrary second screens need the same live state and click behavior without duplicating access to private Codex and Claude data. Local certificates would require a more complex trust and recovery flow than the initial Wi-Fi feature warrants.

## Consequences

- Android and web displays work without a physical Stream Deck.
- Any modern browser on the LAN can display cards without installing an app.
- Android receives no local database paths, session targets, or credentials beyond its pairing token.
- Browser pairing tokens remain in origin-scoped local storage; WebSocket URLs are never navigated to or rendered.
- LAN devices cannot approve themselves because approval endpoints accept only loopback connections from the desktop.
- Access requests expire after five minutes and are rate limited to reduce notification spam.
- A paired phone can request that the desktop open any currently displayed card.
- DNS-SD normally removes manual IP entry; manual host and port remain available when multicast discovery is blocked.
- LAN traffic is not encrypted and must not be exposed to public or untrusted networks.
