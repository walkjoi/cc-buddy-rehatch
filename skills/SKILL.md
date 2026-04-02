---
name: cc-buddy-rehatch-cli
description: Guide for using the cc-buddy-rehatch CLI in this repository to inspect, rehatch, verify, and restore Claude Code buddies. Use when an agent needs to operate `bun run src/cli.ts`, choose between full rehatch, `--appearance-only`, or `--soul-only`, inspect the current buddy soul and appearance, or safely recover from a patch with `restore`.
---

# CC Buddy Rehatch CLI

## Overview

Use this skill when working with the `cc-buddy-rehatch` CLI in this repo.

Prefer deterministic non-interactive commands over the Ink UI unless the user explicitly wants to drive the selection flow manually.

Run commands from the repository root with:

```bash
bun run src/cli.ts <command> ...
```

Do not use the deleted prototype entrypoints (`index.js`, `ui.jsx`, `sprites.js`).

## Workflow

1. Start with a read-only command unless the user already asked for a mutation.
2. Use `current` to see the current appearance and soul.
3. Use `inspect` when you need binary path, config path, fingerprint, or salt details.
4. Use `doctor` before patching if compatibility or environment health is uncertain.
5. Before `rehatch` or `restore`, make sure Claude Code is fully closed.
6. After a write operation, use `current` or `verify` to inspect the new local state.
7. Tell the user to reopen Claude Code and run `/buddy` after any operation that clears or refreshes the soul.

## Command Selection

- `current`
  Use to show the current buddy appearance plus the current soul (`Name` and `Soul`) if one exists in config.
- `inspect`
  Use to show detection details: binary path, config path, runtime, hash backend, fingerprint markers, salt, and current buddy.
- `doctor`
  Use for preflight checks before patching or when detection looks suspicious.
- `verify`
  Use to confirm that explicit appearance traits match the current salt result.
  It prints the current soul, but target matching only applies to appearance fields.
- `rehatch`
  Default behavior is a full refresh.
  It searches for a new salt and also clears the current soul so Claude regenerates name and personality on the next `/buddy`.
- `restore`
  Use to restore the latest recorded backup of the Claude Code target.

## Rehatch Scopes

- Full rehatch
  Default.
  Use `bun run src/cli.ts rehatch` for interactive mode, or add target flags such as `--species cat`.
  This refreshes appearance and soul.
- Appearance-only rehatch
  Use `bun run src/cli.ts rehatch --species cat --appearance-only`.
  This keeps the current name and personality while changing the appearance.
- Soul-only rehatch
  Use `bun run src/cli.ts rehatch --soul-only`.
  This keeps the current appearance and clears only the current soul so the next `/buddy` generates a new name and personality.

If the user asks to “rehatch everything”, “fully reroll”, or “refresh both the look and description”, use the default full rehatch.

If the user asks to keep the current name or personality, add `--appearance-only`.

If the user asks to keep the current look but refresh the text, use `--soul-only`.

## Important Behaviors

- Default `rehatch` is no longer appearance-only.
  It is a full refresh.
- Search excludes the current salt.
  Even if the current buddy already matches part of the target, the CLI still searches for a new salt.
- `verify --species ...` validates appearance traits only.
  Do not claim it verifies soul text.
- After a full rehatch or soul-only rehatch, `current` may show the soul as pending until Claude Code runs `/buddy` and writes a new `companion` object.
- `--soul-only` is only valid if the current appearance already satisfies any supplied target flags.
  If the user also wants to change appearance, use a full rehatch instead.
- `--rehatch-soul` exists as a legacy compatibility flag.
  Prefer `--appearance-only` and `--soul-only` in new work.

## Recommended Command Patterns

Read-only inspection:

```bash
bun run src/cli.ts current
bun run src/cli.ts inspect
bun run src/cli.ts doctor
```

Full refresh to a target appearance:

```bash
bun run src/cli.ts rehatch --species cat
```

Keep current soul, change only appearance:

```bash
bun run src/cli.ts rehatch --species cat --appearance-only
```

Keep current appearance, generate a new soul:

```bash
bun run src/cli.ts rehatch --soul-only
```

Verify a target appearance:

```bash
bun run src/cli.ts verify --species cat
```

Restore the last backup:

```bash
bun run src/cli.ts restore
```

Use `--json` when another tool or agent needs stable machine-readable output.

## References

- Read [references/cli-behavior.md](references/cli-behavior.md) for a command matrix and example flows.
- Read [README.md](../../../README.md) if you need the repo's user-facing CLI summary.
- Read [src/cli.ts](../../../src/cli.ts) if you need the exact current flags or help text.
