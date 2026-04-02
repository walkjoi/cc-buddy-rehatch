# CLI Behavior

## Repository Entry Point

Run the tool from the repository root:

```bash
bun run src/cli.ts <command> ...
```

The supported top-level commands are:

- `rehatch`
- `current`
- `inspect`
- `doctor`
- `verify`
- `restore`

## Read-Only Commands

### `current`

Shows:

- detected binary path
- detected config path
- target runtime and hash backend
- user ID preview
- current salt
- current soul if present
- current buddy card

Use it first when the user asks what the buddy currently is.

### `inspect`

Adds:

- backup directory
- SHA-256 fingerprint
- marker list
- recognized yes/no

Use it when debugging detection or patch targeting.

### `doctor`

Use it before patching when:

- the environment may be stale
- Claude Code might still be running
- fingerprint recognition looks weak
- the user asks whether the tool is safe to run

### `verify`

Use it when you want to confirm explicit appearance fields after a patch.

Examples:

```bash
bun run src/cli.ts verify --species cat
bun run src/cli.ts verify --species cat --rarity uncommon
```

Important:

- It prints the current soul.
- `Target match` only reflects explicit appearance fields.
- It does not compare or validate `Name` or `Soul`.

## Write Commands

### Full rehatch

Default behavior:

```bash
bun run src/cli.ts rehatch --species cat
```

This does two things:

1. Finds a new salt that yields the requested appearance.
2. Clears the current soul so Claude regenerates name and personality on the next `/buddy`.

### Appearance-only rehatch

```bash
bun run src/cli.ts rehatch --species cat --appearance-only
```

Use this when the user wants to keep the current `Name` and `Soul`.

### Soul-only rehatch

```bash
bun run src/cli.ts rehatch --soul-only
```

Use this when the user wants to keep the current appearance but refresh name and personality.

If the user passes target appearance flags together with `--soul-only`, the current buddy must already match those flags. Otherwise the CLI errors and a full rehatch is required.

### Restore

```bash
bun run src/cli.ts restore
```

Use this to revert the local Claude Code target to the latest backup.

## Operational Notes

- Close Claude Code before `rehatch` or `restore`.
- Use `current` or `verify` after a mutation to inspect the local result.
- After any operation that clears soul state, tell the user to reopen Claude Code and run `/buddy`.
- Default search excludes the current salt, so a successful `rehatch` is a real reseed, not a no-op reuse of the current buddy.
- Prefer non-interactive commands in agent work so the command can be replayed and audited.

## Example Flows

### Read-only diagnosis

```bash
bun run src/cli.ts doctor
bun run src/cli.ts inspect
bun run src/cli.ts current
```

### Full refresh to a chosen species

```bash
bun run src/cli.ts rehatch --species cat
bun run src/cli.ts current
bun run src/cli.ts verify --species cat
```

Then tell the user to reopen Claude Code and run `/buddy`.

### Keep current soul, change only the look

```bash
bun run src/cli.ts rehatch --species penguin --appearance-only
bun run src/cli.ts verify --species penguin
```

### Keep current look, refresh only the soul

```bash
bun run src/cli.ts current
bun run src/cli.ts rehatch --soul-only
```

Then tell the user to run `/buddy` so Claude writes the new name and personality.
