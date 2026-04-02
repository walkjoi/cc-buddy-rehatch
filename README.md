# cc-buddy-rehatch

`cc-buddy-rehatch` is a Bun-first, TypeScript implementation of a Claude Code buddy rehatch tool. It inspects the local Claude Code install, detects the current buddy salt, searches for a salt that produces a chosen appearance, patches the local binary, and clears the companion cache so Claude Code can rehatch the buddy on next launch.

By default, `rehatch` performs a full refresh: it searches for a new compatible appearance and clears the current buddy soul so Claude Code generates a fresh name and personality on the next `/buddy`. Use `--appearance-only` to keep the current soul, or `--soul-only` to keep the current appearance and refresh just the soul.

This project is based on reverse-engineered community findings, not official Anthropic buddy APIs.

## Requirements

- Bun 1.3+
- A local Claude Code install
- Claude Code fully closed before patching

## Install

```bash
bun install
```

## Usage

```bash
# Interactive rehatch flow
bun run src/cli.ts rehatch

# Non-interactive rehatch
bun run src/cli.ts rehatch --species dragon --rarity legendary --eye ✦ --hat wizard --shiny

# Keep the current name/personality and refresh appearance only
bun run src/cli.ts rehatch --species cat --appearance-only

# Keep the current appearance and refresh name/personality only
bun run src/cli.ts rehatch --soul-only

# Show the current buddy
bun run src/cli.ts current

# Inspect the detected Claude Code target
bun run src/cli.ts inspect

# Run safety checks
bun run src/cli.ts doctor

# Verify that the current buddy matches a target
bun run src/cli.ts verify --species dragon --rarity legendary

# Restore the latest backup
bun run src/cli.ts restore
```

## Commands

- `rehatch`: interactive flow by default; supports `--species`, `--rarity`, `--eye`, `--hat`, `--shiny`, `--no-shiny`, `--appearance-only`, `--soul-only`
- `current`: show the currently detected buddy card
- `inspect`: print detected paths, fingerprint, salt, and current buddy
- `doctor`: run install/config/fingerprint/salt compatibility checks
- `verify`: verify the current buddy against an optional target
- `restore`: restore the latest backup recorded by the manifest

## Common Flags

- `--binary-path <path>`
- `--config-path <path>`
- `--backup-dir <path>`
- `--force`
- `--json`
- `--verbose`
- `--no-sign`
- `--timeout <ms>`

## Development

```bash
bun run typecheck
bun test
```

## Caveats

- This tool patches a local closed-source binary and may break when Claude Code internals change.
- Compatibility is best-effort and marker-based in v1.
- macOS patching may require ad-hoc re-signing.
