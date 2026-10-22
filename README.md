# Streamdek Codex Status

Show live Codex tasks and active scheduled automations on an Elgato Stream Deck. Press a card to open its task in the ChatGPT desktop app.

Supports Windows, macOS, and Linux without the Elgato desktop application.

## Cards

- Pink `ASKING`: waiting for an answer.
- Blue `WORKING`: an agent or automation is running.
- Red `ERROR`: the latest run failed.
- Purple `SCHEDULED`: an enabled automation.
- Green `DONE`: a recently completed task.
- Gray `IDLE`: a recent task without a recorded run.

Ordinary tasks disappear after 24 hours without activity. Active automations stay visible.

## Requirements

- Node.js 24 or newer.
- A connected Elgato Stream Deck.
- The ChatGPT desktop app, signed in to Codex.
- The repository must remain at its installed path. Rerun the installer after moving it.

The Linux ChatGPT app is currently a preview supported on Ubuntu 24.04/26.04, Debian 13, Fedora 43/44, and current Arch Linux. Other systemd desktops may run Streamdek, but are not formally supported by OpenAI.

Quit the Elgato Stream Deck application if it is installed because only one application can control the device directly.

## Install

Clone the repository, enter its directory, then run the command for your platform:

| Platform | Install and start at login |
|---|---|
| Windows | `powershell -ExecutionPolicy Bypass -File scripts\install.ps1` |
| macOS | `./scripts/install-macos.sh` |
| Linux | `./scripts/install-linux.sh` |

The Linux installer adds the upstream desktop-user udev permissions and may ask for `sudo`. Unplug and reconnect the Stream Deck once after the first installation.

## Uninstall

| Platform | Stop and remove startup |
|---|---|
| Windows | `powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1` |
| macOS | `./scripts/uninstall-macos.sh` |
| Linux | `./scripts/uninstall-linux.sh` |

## Logs

| Platform | Location |
|---|---|
| Windows | `%LOCALAPPDATA%\streamdek\streamdek.log` |
| macOS | `~/Library/Application Support/streamdek/streamdek.log` |
| Linux | `${XDG_STATE_HOME:-~/.local/state}/streamdek/streamdek.log` |

Optional environment variables:

- `STREAMDEK_STALE_HOURS` — task expiry, default `24`.
- `STREAMDEK_POLL_MS` — refresh interval, default `2000`.
- `STREAMDEK_STATE_DIR` — absolute directory for logs and the process file.
- `CODEX_HOME` — Codex state directory, default `~/.codex`.

The service reads Codex databases in read-only mode and controls the Stream Deck directly. URL opening uses `explorer.exe` on Windows, `open` on macOS, and `xdg-open` on Linux.

## Development

Run `npm test`, `npm run typecheck`, and `npm run build`.

## References

- [ChatGPT desktop deep links](https://learn.chatgpt.com/docs/reference/commands#deep-links)
- [ChatGPT desktop app for Linux](https://learn.chatgpt.com/docs/linux/linux-app)
- [Stream Deck Node library and Linux permissions](https://github.com/Julusian/node-elgato-stream-deck/tree/main/packages/node)
- [XDG Base Directory specification](https://specifications.freedesktop.org/basedir/)
- [systemd service units](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [Apple LaunchAgents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
