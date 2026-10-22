# Streamdek Codex Status

The connected 15-key Stream Deck shows live Codex tasks and active scheduled automations. Press a card to open its task in Codex.

## Cards

- Pink `ASKING`: waiting for an answer.
- Blue `WORKING`: an agent or automation is running.
- Red `ERROR`: the latest run failed.
- Purple `SCHEDULED`: an enabled automation.
- Green `DONE`: a recently completed task.
- Gray `IDLE`: a recent task without a recorded run.

Ordinary tasks disappear after 24 hours without activity. Active automations stay visible.

## Controls

Run `powershell -ExecutionPolicy Bypass -File scripts\install.ps1` to build, start, and add it to Windows startup.

Run `powershell -ExecutionPolicy Bypass -File scripts\uninstall.ps1` to stop it and remove it from Windows startup.

Logs are stored at `%LOCALAPPDATA%\streamdek\streamdek.log`.

Optional environment variables:

- `STREAMDEK_STALE_HOURS` — task expiry, default `24`.
- `STREAMDEK_POLL_MS` — refresh interval, default `2000`.

The service reads Codex databases in read-only mode and controls the Stream Deck directly, so the Elgato desktop application is not required.
