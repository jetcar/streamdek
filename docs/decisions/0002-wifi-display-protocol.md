# ADR 0002: Authenticated local Wi-Fi display protocol

## Status

Accepted

## Decision

Expose card snapshots from the desktop service over an authenticated WebSocket and advertise the endpoint with DNS-SD. Pair Android clients with a six-digit code and retain a random bearer token for later reconnection. Send structured card data rather than rendered images, and keep task targets only on the desktop.

Use cleartext HTTP and WebSocket transport for the first LAN release. Restrict intended use to trusted private networks and revisit certificate-pinned TLS before supporting untrusted networks or remote access.

## Context

The existing collectors, card ordering, and task-opening logic already run on the desktop. Android needs the same live state and click behavior without duplicating access to private Codex and Claude data. Local certificates would require a more complex trust and recovery flow than the initial Wi-Fi feature warrants.

## Consequences

- The Android app works without a physical Stream Deck.
- Android receives no local database paths, session targets, or credentials beyond its pairing token.
- A paired phone can request that the desktop open any currently displayed card.
- DNS-SD normally removes manual IP entry; manual host and port remain available when multicast discovery is blocked.
- LAN traffic is not encrypted and must not be exposed to public or untrusted networks.
