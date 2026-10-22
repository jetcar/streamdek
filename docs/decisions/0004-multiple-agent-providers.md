# ADR 0004: Multiple local agent providers

## Status

Accepted

## Decision

Normalize Codex tasks and Claude Code sessions into the existing thread record and card model. Provider-specific readers remain separate and read only local state. Cards carry a typed target: Codex cards open desktop deep links, while Claude cards launch `claude --resume <session-id>` in a native terminal.

Claude Code sessions are discovered from recent JSONL transcripts below `~/.claude/projects`. Completed responses, API errors, active tool work, and explicit `AskUserQuestion` or `ExitPlanMode` tool calls map to the shared card statuses. The reader caches unchanged transcripts and ignores files older than the configured stale interval.

## Context

Codex exposes local SQLite state and desktop deep links. Claude Code officially supports resuming a session by ID, but does not expose ordinary interactive sessions through a documented local status API. Its documented hooks include session IDs and transcript paths, but installing global hooks would modify user configuration and require coordinated cleanup.

## Consequences

- No Claude Code configuration changes or hooks are required.
- Session reopening follows Claude Code's documented `--resume` interface.
- Transcript parsing is isolated because the JSONL storage schema is not a documented public API and may change.
- Permission prompts that are not represented as explicit question tools may appear as working rather than asking.
- Codex scheduled automations remain supported; Claude Code scheduled-task metadata is not currently exposed through a stable local interface.
