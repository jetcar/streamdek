# ADR 0005: Browser session auto-approval

## Status

Accepted

## Context

Streamdek already exposes authenticated live session cards to approved browsers. Some trusted sessions perform long-running, reversible work but stop for routine confirmations. Global permission bypass would affect unrelated sessions and remove the user's ability to bound that trust.

## Decision

Add an `AUTO` toggle to each Codex and Claude session card. The allowlist is stored in the browser's local storage, so enabling it on one display does not enable it elsewhere. When an allowlisted card enters the asking state, the browser sends one authenticated WebSocket approval action. The desktop resumes the matching session with an explicit approval response through the provider CLI.

The server accepts the action only for a currently published card whose status is `asking`. It does not persist an approval policy and cannot enable auto-approval without an already approved browser token.

## Consequences

- Trust is scoped by session and browser instead of being global.
- The user explicitly opts in for every selected session.
- All requests within an enabled session are approved; users must restrict this to trusted, reversible work.
- Provider CLI resume behavior is the integration boundary and may require maintenance when Codex or Claude changes its CLI.
- Prompts that providers do not expose in local session state cannot trigger the browser action.
