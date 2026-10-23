# Streamdek Agent Status

Show live Codex and Claude Code sessions plus active Codex scheduled automations on an Elgato Stream Deck or Android phone. Press a card to reopen its task on the desktop.

Supports Windows, macOS, and Linux without the Elgato desktop application. The Android display connects directly over local Wi-Fi.

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

- ChatGPT desktop with Codex, Claude Code, or both.
- A connected Elgato Stream Deck, an Android 8+ phone on the same Wi-Fi network, or both.
- Claude Code must be available as `claude` on `PATH` to reopen Claude sessions.

The Linux ChatGPT app is currently a preview supported on Ubuntu 24.04/26.04, Debian 13, Fedora 43/44, and current Arch Linux. Other systemd desktops may run Streamdek, but are not formally supported by OpenAI.

Quit the Elgato Stream Deck application if it is installed because only one application can control the device directly.

## Android Wi-Fi display

Install `streamdek-*-android.apk` from the latest release. Keep the desktop and phone on the same trusted private Wi-Fi network.

1. Start Streamdek on the desktop and open its log to find the six-digit pairing code.
2. Open the Android app and allow local-network access when requested.
3. Select the discovered desktop, enter the code, and press **Pair**. If discovery is unavailable, enter the desktop IP and port, such as `192.168.1.20:8910`.

The app reconnects automatically and stores only the server address and random pairing token. Tapping a card asks the desktop to open that Codex or Claude session. Windows may show a firewall prompt the first time; allow access on private networks.

Wi-Fi transport is authenticated but not encrypted. Do not expose port `8910` to the internet or use it on an untrusted network.

## Install

Download the native installer for your operating system from the [latest release](https://github.com/jetcar/streamdek/releases/latest). Node.js and production dependencies are included.

| Platform | Installer |
|---|---|
| Windows | Run `streamdek-*-windows-x64-setup.exe` |
| macOS Apple silicon | Open `streamdek-*-macos-arm64.pkg` |
| macOS Intel | Open `streamdek-*-macos-x64.pkg` |
| Debian/Ubuntu x64 | Install `streamdek-*-linux-x64.deb` |
| Debian/Ubuntu ARM64 | Install `streamdek-*-linux-arm64.deb` |
| Android 8+ | Install `streamdek-*-android.apk` |

The desktop installers are currently unsigned, so the operating system may ask you to confirm the download. The Android APK is signed. The Linux package adds the upstream desktop-user udev permissions. Unplug and reconnect the Stream Deck once after the first installation.

Desktop installations start automatically after login and relaunch Streamdek after an unexpected process exit.

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
- `STREAMDEK_WIFI_PORT` — Android display server port, default `8910`.
- `STREAMDEK_STATE_DIR` — absolute directory for logs and the process file.
- `CODEX_HOME` — Codex state directory, default `~/.codex`.
- `CLAUDE_CONFIG_DIR` — Claude Code state directory, default `~/.claude`.

The service reads Codex databases and Claude Code transcripts in read-only mode and controls the Stream Deck directly. Codex links use the operating system URL opener. Claude sessions open in Command Prompt on Windows, Terminal on macOS, and `x-terminal-emulator` on Linux.

## Development

Run `npm test`, `npm run typecheck`, and `npm run build` for the desktop service. Run `cd android` and `./gradlew testDebugUnitTest assembleDebug` for Android.

## References

- [ChatGPT desktop deep links](https://learn.chatgpt.com/docs/reference/commands#deep-links)
- [ChatGPT desktop app for Linux](https://learn.chatgpt.com/docs/linux/linux-app)
- [Claude Code CLI session resume](https://code.claude.com/docs/en/cli-reference)
- [Stream Deck Node library and Linux permissions](https://github.com/Julusian/node-elgato-stream-deck/tree/main/packages/node)
- [XDG Base Directory specification](https://specifications.freedesktop.org/basedir/)
- [systemd service units](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html)
- [Apple LaunchAgents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
