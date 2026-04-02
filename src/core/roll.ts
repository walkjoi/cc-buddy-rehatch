import { EYES, HATS, RARITIES, RARITY_FLOOR, RARITY_TOTAL, RARITY_WEIGHTS, SPECIES, STAT_NAMES } from "./constants";
import { getDefaultHashBackend } from "./hash";
import { mulberry32, pick } from "./prng";
import type { BuddyRarity, BuddyRoll, BuddyStats, HashBackend, RehatchTarget } from "./types";

export function rollRarity(rng: () => number): BuddyRarity {
  let roll = rng() * RARITY_TOTAL;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) {
      return rarity;
    }
  }

  return "common";
}

export function rollFromSalt(
  userId: string,
  salt: string,
  hashBackend: HashBackend = getDefaultHashBackend(),
): BuddyRoll {
  const rng = mulberry32(hashBackend.hash32(userId + salt));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat = rarity === "common" ? "none" : pick(rng, HATS);
  const shiny = rng() < 0.01;

  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) {
    dump = pick(rng, STAT_NAMES);
  }

  const stats = {} as BuddyStats;
  for (const statName of STAT_NAMES) {
    if (statName === peak) {
      stats[statName] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
      continue;
    }

    if (statName === dump) {
      stats[statName] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
      continue;
    }

    stats[statName] = floor + Math.floor(rng() * 40);
  }

  return { rarity, species, eye, hat, shiny, stats };
}

export function matchesTarget(roll: BuddyRoll, target: RehatchTarget): boolean {
  if (target.species && roll.species !== target.species) {
    return false;
  }
  if (target.rarity && roll.rarity !== target.rarity) {
    return false;
  }
  if (target.eye && roll.eye !== target.eye) {
    return false;
  }
  if (target.hat && roll.hat !== target.hat) {
    return false;
  }
  if (target.shiny !== undefined && roll.shiny !== target.shiny) {
    return false;
  }
  return true;
}
