# ADR 0003: Tag-driven platform releases

## Status

Accepted

## Decision

Semantic version tags trigger a GitHub Actions workflow that tests and builds Streamdek independently on Windows, macOS, and Linux. The workflow publishes one platform archive plus a SHA-256 checksum file to a GitHub release.

Release archives contain compiled JavaScript, production package metadata, the README, and only the relevant platform installer. Native Node dependencies are installed on the destination computer, selecting binaries for its operating system and processor architecture.

## Context

Bundling `node_modules` would make archives architecture-specific, large, and tied to the build runner. Shipping only source would require TypeScript build tooling on every destination. Prebuilt JavaScript with destination-side production dependency installation keeps three small platform releases usable across supported x64 and ARM64 computers.

## Consequences

- Users need Node.js 24 or newer and network access during installation.
- Release builds use the same tests and type checks as continuous integration.
- Windows receives a ZIP; macOS and Linux receive tarballs with executable shell installers.
- GitHub generates release notes and the workflow publishes `SHA256SUMS.txt` for integrity checks.
