import type { BuddyEye, BuddyHat, BuddyRarity, BuddySpecies, StatName } from "./types";

export const ORIGINAL_SALT = "friend-2026-401";
export const SALT_LEN = ORIGINAL_SALT.length;
export const SEARCH_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
export const FRIEND_PREFIX = "friend-2026-";
export const NUMERIC_SEARCH_LIMIT = 1_000_000_000;

export const RARITIES: BuddyRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
export const RARITY_WEIGHTS: Record<BuddyRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1,
};
export const RARITY_TOTAL = Object.values(RARITY_WEIGHTS).reduce((total, value) => total + value, 0);
export const RARITY_FLOOR: Record<BuddyRarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

export const SPECIES: BuddySpecies[] = [
  "duck",
  "goose",
  "blob",
  "cat",
  "dragon",
  "octopus",
  "owl",
  "penguin",
  "turtle",
  "snail",
  "ghost",
  "axolotl",
  "capybara",
  "cactus",
  "robot",
  "rabbit",
  "mushroom",
  "chonk",
];

export const EYES: BuddyEye[] = ["·", "✦", "×", "◉", "@", "°"];
export const HATS: BuddyHat[] = ["none", "crown", "tophat", "propeller", "halo", "wizard", "beanie", "tinyduck"];
export const STAT_NAMES: StatName[] = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];

export const RARITY_LABELS: Record<BuddyRarity, string> = {
  common: "Common (60%)",
  uncommon: "Uncommon (25%)",
  rare: "Rare (10%)",
  epic: "Epic (4%)",
  legendary: "Legendary (1%)",
};

export const BINARY_MARKERS = ["rollRarity", "CompanionBones", "inspirationSeed", "companionUserId"];
