#!/usr/bin/env bun

import { parseArgs } from "util";

import { printTraitCatalog, type CommonCommandOptions, type RehatchCommandOptions } from "./commands/shared";
import { runCurrentCommand } from "./commands/current";
import { runDoctorCommand } from "./commands/doctor";
import { runInspectCommand } from "./commands/inspect";
import { runRehatchCommand } from "./commands/rehatch";
import { runRestoreCommand } from "./commands/restore";
import { runVerifyCommand } from "./commands/verify";

function printHelp(): void {
  console.log(`
cc-buddy-rehatch — rehatch your Claude Code buddy

Usage:
  bun run src/cli.ts rehatch
  bun run src/cli.ts rehatch --species dragon --rarity legendary --eye ✦ --hat wizard --shiny
  bun run src/cli.ts rehatch --species cat
  bun run src/cli.ts rehatch --species cat --appearance-only
  bun run src/cli.ts rehatch --soul-only
  bun run src/cli.ts current
  bun run src/cli.ts inspect
  bun run src/cli.ts doctor
  bun run src/cli.ts verify --species dragon
  bun run src/cli.ts restore

Commands:
  rehatch   Interactive or flag-driven buddy rehatch
  current   Show the current detected buddy
  inspect   Print target paths, fingerprint, salt, and buddy
  doctor    Run compatibility and safety checks
  verify    Verify the current buddy against an optional target
  restore   Restore the latest backup

Flags:
  --binary-path <path>
  --config-path <path>
  --backup-dir <path>
  --species <name>
  --rarity <name>
  --eye <char>
  --hat <name>
  --shiny / --no-shiny
  --json
  --verbose
  --force
  --no-sign
  --timeout <ms>
  --appearance-only
  --soul-only
  --list
  --help
`);
}

function parseCliOptions(argv: string[]): { command: string; options: RehatchCommandOptions & { help?: boolean; list?: boolean } } {
  const [maybeCommand, ...rest] = argv;
  const knownCommands = new Set(["rehatch", "current", "inspect", "doctor", "verify", "restore"]);
  const command = maybeCommand && !maybeCommand.startsWith("-") && knownCommands.has(maybeCommand) ? maybeCommand : "rehatch";
  const args = command === "rehatch" && (!maybeCommand || maybeCommand.startsWith("-")) ? argv : rest;
  const shiny = args.includes("--no-shiny") ? false : args.includes("--shiny") ? true : undefined;
  const appearanceOnly = args.includes("--appearance-only");
  const soulOnly = args.includes("--soul-only");
  const legacyRehatchSoul = args.includes("--rehatch-soul");
  const filteredArgs = args.filter(
    (value) =>
      value !== "--no-shiny" &&
      value !== "--shiny" &&
      value !== "--appearance-only" &&
      value !== "--soul-only" &&
      value !== "--rehatch-soul",
  );
  const { values } = parseArgs({
    args: filteredArgs,
    strict: false,
    options: {
      "binary-path": { type: "string" },
      "config-path": { type: "string" },
      "backup-dir": { type: "string" },
      species: { type: "string" },
      rarity: { type: "string" },
      eye: { type: "string" },
      hat: { type: "string" },
      json: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      "no-sign": { type: "boolean", default: false },
      timeout: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
      list: { type: "boolean", default: false },
    },
  });
  const raw = values as Record<string, string | boolean | undefined>;

  return {
    command,
    options: {
      ...(typeof raw["binary-path"] === "string" ? { binaryPath: raw["binary-path"] } : {}),
      ...(typeof raw["config-path"] === "string" ? { configPath: raw["config-path"] } : {}),
      ...(typeof raw["backup-dir"] === "string" ? { backupDir: raw["backup-dir"] } : {}),
      ...(typeof raw.species === "string" ? { species: raw.species } : {}),
      ...(typeof raw.rarity === "string" ? { rarity: raw.rarity } : {}),
      ...(typeof raw.eye === "string" ? { eye: raw.eye } : {}),
      ...(typeof raw.hat === "string" ? { hat: raw.hat } : {}),
      ...(shiny !== undefined ? { shiny } : {}),
      json: Boolean(raw.json),
      verbose: Boolean(raw.verbose),
      force: Boolean(raw.force),
      noSign: Boolean(raw["no-sign"]),
      appearanceOnly,
      soulOnly,
      rehatchSoul: legacyRehatchSoul,
      ...(typeof raw.timeout === "string" ? { timeout: Number(raw.timeout) } : {}),
      help: Boolean(raw.help),
      list: Boolean(raw.list),
    },
  };
}

async function dispatch(command: string, options: RehatchCommandOptions & CommonCommandOptions): Promise<void> {
  switch (command) {
    case "rehatch":
      await runRehatchCommand(options);
      return;
    case "current":
      await runCurrentCommand(options);
      return;
    case "inspect":
      await runInspectCommand(options);
      return;
    case "doctor":
      await runDoctorCommand(options);
      return;
    case "verify":
      await runVerifyCommand(options);
      return;
    case "restore":
      await runRestoreCommand(options);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function main(): Promise<void> {
  const { command, options } = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.list) {
    printTraitCatalog();
    return;
  }

  await dispatch(command, options);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
