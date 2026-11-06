# ADR 0006: Cross-platform tray shell

## Status

Accepted

## Decision

Package Streamdek as an Electron desktop application on Windows, macOS, and Linux. It starts hidden, owns a native notification-area/menu-bar icon, opens the existing web dashboard when clicked, and exposes Restart and Exit through its native tray menu.

The existing Stream Deck, agent-state, and local web-server code continues to run in the Electron main process. Native dependencies are rebuilt for Electron on each release runner. Platform startup mechanisms launch the packaged desktop executable with `--background` rather than launching `node dist/app.js`.

## Context

The previous standalone Node.js process behaved like a console program on Windows and offered no native way to open, restart, or exit Streamdek. A desktop shell is required on all three supported operating systems, but duplicating lifecycle UI in PowerShell, Swift, and Linux toolkit code would create three implementations.

Electron supplies one tray and window API across all supported systems while preserving the existing TypeScript application and local web dashboard.

## Consequences

- Startup is hidden and does not leave a console window open.
- Clicking the tray icon opens the Streamdek dashboard.
- Restart and Exit are available from the tray menu.
- Installers are larger because they include the Electron runtime.
- Linux desktops must provide a compatible system tray implementation and Electron's GTK runtime libraries.
- Desktop release artifacts remain architecture-specific and unsigned.
