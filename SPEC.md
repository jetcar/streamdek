# Streamdek specification

## Goal

Show current Codex task and automation status on a connected 15-key Stream Deck MK.2. Pressing a key opens the related Codex task.

## Behaviour

- Refresh the deck every 2 seconds.
- Show at most 15 cards, ordered: asking, thinking, failed, scheduled, completed/idle.
- Hide ordinary tasks with no activity for 24 hours.
- Keep active scheduled automations visible regardless of age.
- Pressing a task card opens `codex://threads/<thread-id>`.
- Pressing an automation card opens its target task when available, otherwise the Codex automations page.
- Run in the background after Windows sign-in.
- Access Codex databases read-only.

## Status mapping

- `asking`: an in-progress task whose latest agent message contains questions.
- `thinking`: any other in-progress task or currently running automation.
- `error`: failed task or latest failed automation run.
- `scheduled`: enabled automation waiting for its next run.
- `done`: completed/interrupted recent task.
- `idle`: recent task without a recorded turn.

## Acceptance criteria

- The attached Stream Deck MK.2 opens successfully.
- Its keys display live Codex task/automation cards.
- A key press launches the mapped Codex deep link.
- Entries older than 24 hours are absent unless they are active automations.
- Database or device errors are logged and retried without crashing permanently.
