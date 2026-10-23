# Changelog

## Unreleased

### Added

- Android 8+ companion display with the same live status colors, titles, response excerpts, and tap-to-open behavior.
- Authenticated local Wi-Fi streaming, six-digit pairing, automatic reconnection, and DNS-SD desktop discovery.
- Signed, installable Android APKs in tagged GitHub releases.

### Changed

- The desktop service now continues collecting and publishing cards when no physical Stream Deck is connected.

## 1.5.0 - 2026-10-22

### Added

- Session cards show a compact line from the agent's latest response beneath the folder or session name.

### Changed

- Active working and asking sessions retain their current button position while their activity and response text update.
- Codex response reads are batched into a single history query.

## 1.4.1 - 2026-10-22

### Fixed

- Codex cards now show the working-folder name, then the saved session name, instead of defaulting to the first prompt.

## 1.4.0 - 2026-10-22

### Added

- Native Windows `.exe`, macOS `.pkg`, and Linux `.deb` installers.
- Self-contained Node.js runtime and production dependencies in every installer.
- Intel and Apple silicon macOS packages plus x64 and ARM64 Linux packages.

### Changed

- Releases no longer publish ZIP or tarball archives.

## 1.3.1 - 2026-10-22

### Changed

- Session cards are ordered by latest activity instead of status, so completion changes color without moving the card behind persistent errors.
- Active scheduled automations use reserved buttons at the end of the layout.

## 1.3.0 - 2026-10-22

### Added

- Claude Code scheduled-task runs are grouped into one card per routine.
- Each routine card shows and reopens its most recent run.

## 1.2.1 - 2026-10-22

### Changed

- Claude Code cards now show the working-folder name, falling back to the saved session name and session ID.

## 1.2.0 - 2026-10-22

### Added

- Claude Code session cards from local read-only transcript history.
- Claude Code status mapping for working, asking, failed, and completed sessions.
- Cross-platform session reopening with `claude --resume`.

## 1.1.0 - 2026-10-22

### Added

- Windows, macOS, and Linux runtime support.
- Native login startup installers for all three platforms.
- Linux Stream Deck udev permissions.
- Versioned platform release archives and SHA-256 checksums.
- Cross-platform GitHub Actions verification.

## 1.0.0 - 2026-10-22

### Added

- Initial Windows Stream Deck status display for Codex tasks and scheduled automations.
