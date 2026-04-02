import chalk from "chalk";

import type { BuddyBones, BuddyRarity, BuddyRoll } from "../core/types";
import { BODIES, HAT_LINES, RARITY_COLORS, RARITY_STARS } from "./data";

export function renderSprite(bones: BuddyBones, frame = 0): string[] {
  const frames = BODIES[bones.species];
  const body = frames[frame % frames.length]!.map((line) => line.replaceAll("{E}", bones.eye));
  const lines = [...body];
  if (bones.hat !== "none" && !lines[0]?.trim()) {
    lines[0] = HAT_LINES[bones.hat];
  }
  if (!lines[0]?.trim() && frames.every((candidate) => !candidate[0]?.trim())) {
    lines.shift();
  }
  return lines;
}

export function colorizeSprite(lines: string[], rarity: BuddyRarity): string[] {
  const colorName = RARITY_COLORS[rarity];
  const colorFn = chalk[colorName] ?? chalk.white;
  return lines.map((line) => colorFn(line));
}

export function formatCompanionCard(result: BuddyRoll): string {
  const sprite = renderSprite({ species: result.species, eye: result.eye, hat: result.hat });
  const colored = colorizeSprite(sprite, result.rarity);
  const colorFn = chalk[RARITY_COLORS[result.rarity]] ?? chalk.white;
  const stars = RARITY_STARS[result.rarity] ?? "";

  const meta = [
    `${result.species} / ${result.rarity}${result.shiny ? " / shiny" : ""}`,
    `eye:${result.eye} / hat:${result.hat}`,
    stars,
  ];

  const lines: string[] = [];
  const spriteWidth = 14;
  for (let index = 0; index < colored.length; index += 1) {
    const right = meta[index] ?? "";
    const rawSpriteLine = sprite[index] ?? "";
    lines.push(`  ${colored[index]}${" ".repeat(Math.max(0, spriteWidth - rawSpriteLine.length))}${right}`);
  }

  for (const [statName, value] of Object.entries(result.stats)) {
    const filled = Math.min(10, Math.max(0, Math.round(value / 10)));
    const bar = colorFn("█".repeat(filled) + "░".repeat(10 - filled));
    lines.push(`  ${statName.padEnd(10)} ${bar} ${String(value).padStart(3)}`);
  }

  return lines.join("\n");
}
