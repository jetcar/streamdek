# ADR 0004: Native self-contained installers

## Status

Accepted

## Decision

Tagged releases publish native installers instead of compressed archives:

- a per-user Inno Setup `.exe` for Windows x64;
- `.pkg` installers for Intel and Apple silicon macOS;
- `.deb` packages for x64 and ARM64 Debian-family Linux.

Each installer bundles the Node.js 24 runtime, compiled JavaScript, and production dependencies built on the matching operating system and processor architecture. Installers configure login startup and install or remove platform integration through native package lifecycle hooks.

Release assets remain unsigned until platform signing identities and secrets are configured. SHA-256 checksums are published for every installer.

## Context

Archive releases required users to extract files, install Node.js, keep the extracted directory in place, and run a script. That made installation and removal feel unfinished and introduced network and package-manager failures during setup.

Bundling the runtime and native dependencies produces larger, architecture-specific artifacts, but makes installation offline, reproducible, and consistent with each operating system.

## Consequences

- Users install through Windows Setup, macOS Installer, or their Debian package manager.
- Node.js and network access are no longer installation prerequisites.
- macOS publishes separate Intel and Apple silicon packages.
- Linux publishes separate x64 and ARM64 packages.
- Windows x64 runs on x64 Windows and compatible Windows ARM systems through emulation.
- Package signing and notarization remain follow-up work.
