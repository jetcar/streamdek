# ADR 0001: Direct HID and read-only Codex state

## Status

Accepted

## Decision

Run a small Node.js background process that controls the Stream Deck directly over USB HID. Read task and automation state from the local Codex SQLite databases in read-only mode.

## Context

The Stream Deck desktop application is not installed on this machine, so an official Stream Deck plugin has no host. A separate Codex app-server process does not share the desktop application's live runtime state, while the local databases are updated by the desktop application.

## Consequences

- No Stream Deck desktop application is required.
- Codex data is never modified.
- The local Codex database schema is internal and could change; the service logs schema failures and keeps retrying.
