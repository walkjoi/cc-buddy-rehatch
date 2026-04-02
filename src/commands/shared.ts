import { EYES, HATS, RARITIES, RARITY_LABELS, SPECIES } from "../core/constants";
import type { BuddyEye, BuddyHat, BuddyRarity, BuddySpecies, OutputEnvelope, RehatchTarget } from "../core/types";

export interface CommonCommandOptions {
  binaryPath?: string;
  configPath?: string;
  backupDir?: string;
  force?: boolean;
  json?: boolean;
  verbose?: boolean;
  noSign?: boolean;
  timeout?: number;
  rehatchSoul?: boolean;
  appearanceOnly?: boolean;
  soulOnly?: boolean;
}

export interface RehatchCommandOptions extends CommonCommandOptions {
  species?: string;
  rarity?: string;
  eye?: string;
  hat?: string;
  shiny?: boolean;
}

export interface RehatchScope {
  rehatchSoul: boolean;
  appearanceOnly: boolean;
  soulOnly: boolean;
}

export function emitEnvelope<T>(command: string, data: T, asJson = false): void {
  if (!asJson) {
    return;
  }

  const envelope: OutputEnvelope<T> = {
    schemaVersion: 1,
    command,
    data,
  };
  console.log(JSON.stringify(envelope, null, 2));
}

export function printHeading(title: string): void {
  console.log(`\n${title}`);
}

export function resolveRehatchScope(options: CommonCommandOptions): RehatchScope {
  if (options.appearanceOnly && options.soulOnly) {
    throw new Error("Choose either --appearance-only or --soul-only, not both.");
  }
  if (options.appearanceOnly && options.rehatchSoul) {
    throw new Error("--appearance-only conflicts with --rehatch-soul.");
  }

  const appearanceOnly = Boolean(options.appearanceOnly);
  const soulOnly = Boolean(options.soulOnly);
  return {
    appearanceOnly,
    soulOnly,
    rehatchSoul: soulOnly || !appearanceOnly,
  };
}

export function parseRehatchTarget(options: RehatchCommandOptions): RehatchTarget {
  const target: RehatchTarget = {};
  if (options.species) {
    if (!SPECIES.includes(options.species as BuddySpecies)) {
      throw new Error(`Unknown species "${options.species}". Use one of: ${SPECIES.join(", ")}`);
    }
    target.species = options.species as BuddySpecies;
  }
  if (options.rarity) {
    if (!RARITIES.includes(options.rarity as BuddyRarity)) {
      throw new Error(`Unknown rarity "${options.rarity}". Use one of: ${RARITIES.join(", ")}`);
    }
    target.rarity = options.rarity as BuddyRarity;
  }
  if (options.eye) {
    if (!EYES.includes(options.eye as BuddyEye)) {
      throw new Error(`Unknown eye "${options.eye}". Use one of: ${EYES.join(" ")}`);
    }
    target.eye = options.eye as BuddyEye;
  }
  if (options.hat) {
    if (!HATS.includes(options.hat as BuddyHat)) {
      throw new Error(`Unknown hat "${options.hat}". Use one of: ${HATS.join(", ")}`);
    }
    target.hat = options.hat as BuddyHat;
  }
  if (options.shiny !== undefined) {
    target.shiny = options.shiny;
  }
  if (target.rarity === "common") {
    target.hat = "none";
  }
  return target;
}

export function hasExplicitTarget(target: RehatchTarget): boolean {
  return Object.keys(target).length > 0;
}

export function formatTarget(target: RehatchTarget): string {
  const parts: string[] = [];
  if (target.species) parts.push(`species=${target.species}`);
  if (target.rarity) parts.push(`rarity=${target.rarity}`);
  if (target.eye) parts.push(`eye=${target.eye}`);
  if (target.hat) parts.push(`hat=${target.hat}`);
  if (target.shiny !== undefined) parts.push(`shiny=${String(target.shiny)}`);
  return parts.join(" ");
}

export function printTraitCatalog(): void {
  console.log("Species:   " + SPECIES.join(", "));
  console.log("Rarity:    " + RARITIES.map((rarity) => RARITY_LABELS[rarity]).join(", "));
  console.log("Eyes:      " + EYES.join("  "));
  console.log("Hats:      " + HATS.join(", "));
}
