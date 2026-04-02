# cc-buddy-rehatch: Technical Design

## Status

- Status: Proposed / implemented in-repo
- Target version: `v0.1.0`
- Runtime: `Bun 1.x`, `TypeScript 5.x`, `React 19`, `Ink 6`, `ESM`
- Primary goal: Rehatch Claude Code buddy to a chosen appearance by finding a compatible salt and patching the local Claude Code binary.

## Overview

`cc-buddy-rehatch` is a Bun-first CLI that re-creates the known buddy generation flow from community reverse-engineering, then searches for a salt that yields a requested buddy appearance. Once a compatible salt is found, the tool backs up the local Claude Code binary, replaces the detected salt, optionally re-signs the binary on macOS, and clears the local companion cache so Claude Code can rehatch the buddy on next launch.

The user-facing verb is `rehatch` instead of `reset` or `reroll` because the workflow is "generate a new buddy from a new seed" rather than "restore defaults" or "overwrite a cached result."

## Evidence, Known Facts, and Inferences

### Known Facts

- Claude Code installation paths vary by platform and distribution method; binary discovery must be heuristic.
- Public official documentation currently does not describe the `/buddy` internals.
- The original JavaScript prototype in this repository demonstrates that salt replacement in the local binary is sufficient to change the resulting buddy.

### Reverse-Engineered Inferences

- Buddy generation likely follows `hash(userId + salt) -> PRNG -> rarity/species/eye/hat/shiny/stats`.
- Claude Code appears to cache companion state locally, but the generated buddy "bones" are derived from the active salt and user identity.
- The string `friend-2026-401` is treated as the original known salt in current community findings.

### References

- [Claude Code overview](https://code.claude.com/docs/en/overview)
- [heise: source-map leak report](https://www.heise.de/en/news/Claude-Code-unintentionally-open-source-Source-map-reveals-all-11242079.html)
- [community reverse-engineering write-up](https://dev.to/vibehackers/i-analyzed-all-512000-lines-of-claude-codes-leaked-source-heres-what-anthropic-was-hiding-4gg8)
- [community reverse-engineering write-up 2](https://dev.to/picklepixel/how-i-reverse-engineered-claude-codes-hidden-pet-system-8l7)

## Goals and Non-Goals

### Goals

- Show the current buddy.
- Support interactive rehatch.
- Support non-interactive rehatch by chosen traits.
- Restore the original binary from a backup.
- Run doctor and verify commands.
- Keep core logic and command surfaces in TypeScript.

### Non-Goals

- Modifying any Claude server-side state.
- Guaranteeing compatibility with every future Claude Code version.
- Shipping a formal config-override patch backend in v1.
- Multi-user profile management or a desktop GUI.

## Chosen Technical Approach

- Bun-first runtime, ESM, and strict TypeScript throughout.
- Ink-based interactive UI for `rehatch`.
- A `salt-replace` patch backend as the only formal v1 patch strategy.
- A pluggable `HashBackend` and `SearchBackend` so algorithm evidence can evolve without rewriting the CLI or patch flow.
- A worker-backed numeric search to avoid blocking the UI thread during salt search.

## Architecture

### Layers

- `src/cli.ts`: argument parsing and command dispatch
- `src/commands/*`: command orchestration and output formatting
- `src/core/*`: traits, hashing, PRNG, roll model, matching, search
- `src/claude/*`: install discovery, config IO, fingerprinting, salt detection, backup, patch, sign, verify
- `src/ui/*`: Ink interactive flow
- `src/sprites/*`: ASCII sprite data and rendering

The UI layer never patches files directly. It only consumes command/service callbacks that return search progress and patch results.

## Public CLI Surface

- `cc-buddy-rehatch rehatch`
- `cc-buddy-rehatch rehatch --species <name> --rarity <name> --eye <char> --hat <name> --shiny|--no-shiny`
- `cc-buddy-rehatch current`
- `cc-buddy-rehatch inspect`
- `cc-buddy-rehatch doctor`
- `cc-buddy-rehatch verify`
- `cc-buddy-rehatch restore`

Common flags:

- `--binary-path`
- `--config-path`
- `--backup-dir`
- `--force`
- `--json`
- `--verbose`
- `--no-sign`
- `--timeout`

Human-readable output is the default. `--json` emits a stable machine-readable object with a `schemaVersion`.

## Core Types and Interfaces

Stable public-facing types:

- `BuddyRoll`
- `RehatchTarget`
- `SearchResult`
- `PatchReport`
- `DoctorReport`
- `VerifyReport`

Stable service interfaces:

- `HashBackend`
- `SearchBackend`
- `PatchBackend`

Internal helper types may grow in v1 as needed, but command outputs should remain stable.

## Buddy Generation Model

- Rarity weights: common `60`, uncommon `25`, rare `10`, epic `4`, legendary `1`
- Trait roll order: rarity, species, eye, hat, shiny, stats
- Common buddies always force `hat = none`
- Stats are generated from a rarity floor, a peak stat, a dump stat, and additional random values
- `matches(target, roll)` only compares fields explicitly provided by the target

## Hashing and PRNG Strategy

- `mulberry32` is the fixed PRNG implementation.
- `HashBackend` is injectable.
- `BunHashBackend` is the default production backend because `Bun.hash` best matches the known Claude Code behavior.
- Test and research backends can be swapped in through fixtures without changing the patching flow.

## Install Discovery and Patch Flow

### Discovery

- Resolve the Claude binary from an explicit path, `which/where`, or known version directories.
- Resolve the config file from explicit paths or the known Claude config locations.
- Extract the user ID from `oauthAccount.accountUuid` first, then legacy `userID`.

### Patch Flow

1. Compute a binary fingerprint and marker evidence.
2. Detect the current salt.
3. Compute the current buddy roll.
4. Search for a matching salt.
5. Create a patch plan.
6. Back up the binary and update the manifest.
7. Replace the salt bytes.
8. Verify the replacement and recomputed roll.
9. Re-sign on macOS unless `--no-sign` was passed.
10. Clear the companion cache keys from config.

If the salt cannot be detected, the tool fails safe and recommends `doctor` rather than attempting a blind patch.

## Safety Model

- Patch only after making a backup.
- Preserve config formatting and only remove companion cache keys.
- Refuse destructive patching when marker evidence is weak unless `--force` is supplied.
- Re-read the binary after patching and verify that the new salt is detectable.

## Testing Strategy

- Golden roll fixtures for fixed `userId + salt -> roll` cases
- Salt detection tests for original and patched salts
- Config cache edit tests preserving indentation
- Patch backend tests covering backup creation and replacement count
- UI and command smoke tests for the main command flow

## Version Compatibility Policy

v1 is marker-based rather than shipping a full known-version allowlist. The tool uses fingerprint evidence and marker density to determine whether a binary looks patchable. Unknown or weakly recognized targets require `--force`.

## Security and User Warnings

- This tool only changes local files on the current machine.
- Reverse-engineered assumptions may become stale when Claude Code changes.
- Claude Code should be fully closed before patching.
- macOS patching may require ad-hoc code signing.

## Rollout Notes

Implementation order:

1. Core roll model and fixtures
2. Install/config/fingerprint/doctor
3. Salt detection and patch backend
4. Current/inspect/verify/restore commands
5. Ink interactive UI
