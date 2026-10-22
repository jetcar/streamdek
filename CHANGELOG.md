# Changelog

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
