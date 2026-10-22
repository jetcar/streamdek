# Streamdek Agent Status

Show live Codex and Claude Code sessions plus active Codex scheduled automations on an Elgato Stream Deck. Press a card to reopen its task.

Supports Windows, macOS, and Linux without the Elgato desktop application.

![Streamdek showing live AI coding-agent statuses on a Stream Deck](docs/images/streamdek-dashboard.png)

## Cards

- Pink `ASKING`: waiting for an answer.
- Blue `WORKING`: an agent or automation is running.
- Red `ERROR`: the latest run failed.
- Purple `SCHEDULED`: an enabled automation.
- Green `DONE`: a recently completed task.
- Gray `IDLE`: a recent task without a recorded run.

Ordinary tasks disappear after 24 hours without activity. Active automations stay visible.
Codex and Claude Code cards show the working-folder name, falling back to the saved session name. Claude cards include a `CLAUDE` footer and reopen in a new terminal with `claude --resume`. Scheduled-task runs are grouped into one card per routine; its status and click target follow the most recent run.
Session cards show a compact excerpt from the latest agent response on the line below the name. Working and asking cards retain their button position while they remain active, so response updates do not make them jump around.

Session cards are ordered by latest activity, independent of status, so finishing a task changes its color without sending it behind older errors. Active scheduled automations occupy reserved buttons at the end, ordered by their next run.

## Requirements

- A connected Elgato Stream Deck.
- ChatGPT desktop with Codex, Claude Code, or both.
- Claude Code must be available as `claude` on `PATH` to reopen Claude sessions.

The Linux ChatGPT app is currently a preview supported on Ubuntu 24.04/26.04, Debian 13, Fedora 43/44, and current Arch Linux. Other systemd desktops may run Streamdek, but are not formally supported by OpenAI.

Quit the Elgato Stream Deck application if it is installed because only one application can control the device directly.

## Install

Download the native installer for your operating system from the [latest release](https://github.com/jetcar/streamdek/releases/latest). Node.js and production dependencies are included.

| Platform | Installer |
|---|---|
| Windows | Run `streamdek-*-windows-x64-setup.exe` |
| macOS Apple silicon | Open `streamdek-*-macos-arm64.pkg` |
| macOS Intel | Open `streamdek-*-macos-x64.pkg` |
| Debian/Ubuntu x64 | Install `streamdek-*-linux-x64.deb` |
| Debian/Ubuntu ARM64 | Install `streamdek-*-linux-arm64.deb` |

The installers are currently unsigned, so the operating system may ask you to confirm the download. The Linux package adds the upstream desktop-user udev permissions. Unplug and reconnect the Stream Deck once after the first installation.

To install from source instead, clone the repository and run `scripts/install.ps1`, `scripts/install-macos.sh`, or `scripts/install-linux.sh`. Source installation requires Node.js 24 or newer.

## Uninstall

| Platform | Stop and remove startup |
|---|---|
| Windows | Windows Settings → Apps → Streamdek |
| macOS | `sudo "/Library/Application Support/Streamdek/uninstall.sh"` |
| Linux | `sudo apt remove streamdek` |

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
- `CLAUDE_CONFIG_DIR` — Claude Code state directory, default `~/.claude`.

The service reads Codex databases and Claude Code transcripts in read-only mode and controls the Stream Deck directly. Codex links use the operating system URL opener. Claude sessions open in Command Prompt on Windows, Terminal on macOS, and `x-terminal-emulator` on Linux.

## Development

Run `npm test`, `npm run typecheck`, and `npm run build`.

## References

- [ChatGPT desktop deep links](https://learn.chatgpt.com/docs/reference/commands#deep-links)
- [ChatGPT desktop app for Linux](https://learn.chatgpt.com/docs/linux/linux-app)
- [Claude Code CLI session resume](https://code.claude.com/docs/en/cli-reference)
- [Stream Deck Node library and Linux permissions](https://github.com/Julusian/node-elgato-stream-deck/tree/main/packages/node)
- [XDG Base Directory specification](https://specifications.freedesktop.org/basedir/)
- [systemd service units](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [Apple LaunchAgents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
