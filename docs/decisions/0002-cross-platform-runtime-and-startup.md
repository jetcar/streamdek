# ADR 0002: Cross-platform runtime and startup

## Status

Accepted

## Decision

Keep one Node.js runtime for Windows, macOS, and Linux. Select the runtime state directory and URL opener from the operating system, while using a native per-user startup mechanism on each platform:

- Windows: the current user's `Run` registry key.
- macOS: a LaunchAgent in `~/Library/LaunchAgents`.
- Linux: a systemd user service plus the Stream Deck library's desktop-user udev rule.

## Context

The device library already supports all three operating systems. The original application was limited by its Windows-only log directory, `explorer.exe` URL opening, and PowerShell startup installer.

Codex deep links are handled by the ChatGPT desktop app on each supported desktop. Linux needs explicit `hidraw` access before an unprivileged user service can open a Stream Deck.

## Consequences

- Runtime behavior stays in one tested TypeScript codebase.
- Each platform uses its standard login service and URL handler.
- Linux installation requires one privileged udev-rule copy and a device reconnect.
- Startup files contain the repository's absolute path, so installation must be rerun after moving the checkout.
