export type BuddyRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type BuddySpecies =
  | "duck"
  | "goose"
  | "blob"
  | "cat"
  | "dragon"
  | "octopus"
  | "owl"
  | "penguin"
  | "turtle"
  | "snail"
  | "ghost"
  | "axolotl"
  | "capybara"
  | "cactus"
  | "robot"
  | "rabbit"
  | "mushroom"
  | "chonk";

export type BuddyEye = "·" | "✦" | "×" | "◉" | "@" | "°";

export type BuddyHat = "none" | "crown" | "tophat" | "propeller" | "halo" | "wizard" | "beanie" | "tinyduck";

export type StatName = "DEBUGGING" | "PATIENCE" | "CHAOS" | "WISDOM" | "SNARK";

export interface BuddyStats {
  DEBUGGING: number;
  PATIENCE: number;
  CHAOS: number;
  WISDOM: number;
  SNARK: number;
}

export interface BuddyBones {
  species: BuddySpecies;
  eye: BuddyEye;
  hat: BuddyHat;
}

export interface BuddyRoll extends BuddyBones {
  rarity: BuddyRarity;
  shiny: boolean;
  stats: BuddyStats;
}

export interface CompanionSoul {
  name: string;
  personality: string;
  hatchedAt?: number;
}

export interface RehatchTarget {
  species?: BuddySpecies;
  rarity?: BuddyRarity;
  eye?: BuddyEye;
  hat?: BuddyHat;
  shiny?: boolean;
}

export interface SearchResult {
  salt: string;
  result: BuddyRoll;
  checked: number;
  elapsedMs: number;
  phase: "prefix" | "numeric";
}

export type SupportedHashBackendName = "bun-hash" | "fnv1a-32";

export type ClaudeTargetRuntime = "node" | "bun" | "unknown";

export interface BinaryFingerprint {
  sha256: string;
  size: number;
  markersFound: string[];
  hasOriginalSalt: boolean;
  recognized: boolean;
}

export interface InstallTarget {
  binaryPath: string;
  configPath: string;
  backupDir: string;
  userId: string;
  userIdPreview: string;
  targetRuntime: ClaudeTargetRuntime;
  hashBackendName: SupportedHashBackendName;
  fingerprint: BinaryFingerprint;
}

export interface PatchPlan {
  backendName: string;
  binaryPath: string;
  configPath: string;
  backupDir: string;
  backupPath: string;
  oldSalt: string;
  newSalt: string;
  fingerprint: BinaryFingerprint;
}

export interface PatchReport {
  schemaVersion: 1;
  success: boolean;
  backendName: string;
  binaryPath: string;
  backupPath: string;
  oldSalt: string;
  newSalt: string;
  replacements: number;
  signed: boolean;
  clearedConfigKeys: string[];
}

export interface DoctorIssue {
  code: string;
  message: string;
  recoverable: boolean;
}

export interface DoctorReport {
  schemaVersion: 1;
  ok: boolean;
  binaryPath?: string;
  configPath?: string;
  userIdPreview?: string;
  fingerprint?: BinaryFingerprint;
  currentSalt?: string;
  issues: DoctorIssue[];
  suggestions: string[];
}

export interface VerifyReport {
  schemaVersion: 1;
  ok: boolean;
  binaryPath: string;
  configPath: string;
  targetRuntime: ClaudeTargetRuntime;
  hashBackendName: SupportedHashBackendName;
  currentSalt: string;
  currentRoll: BuddyRoll;
  currentSoul: CompanionSoul | null;
  target?: RehatchTarget;
  matchesTarget: boolean;
}

export interface InspectReport {
  schemaVersion: 1;
  installTarget: InstallTarget;
  currentSalt: string;
  currentRoll: BuddyRoll;
  currentSoul: CompanionSoul | null;
}

export interface OutputEnvelope<T> {
  schemaVersion: 1;
  command: string;
  data: T;
}

export interface SearchProgress {
  checked: number;
  elapsedMs: number;
  phase: "prefix" | "numeric";
}

export interface SearchOptions {
  onProgress?: (progress: SearchProgress) => void;
  signal?: AbortSignal;
  workerCount?: number;
  maxNumericAttempts?: number;
  timeoutMs?: number;
  hashBackendName?: SupportedHashBackendName;
  excludeSalt?: string;
}

export interface HashBackend {
  readonly name: string;
  hash32(input: string): number;
}

export interface SearchBackend {
  readonly name: string;
  find(userId: string, target: RehatchTarget, options?: SearchOptions): Promise<SearchResult | null>;
}

export interface PatchBackend {
  readonly name: string;
  createPlan(input: {
    binaryPath: string;
    configPath: string;
    backupDir: string;
    currentSalt: string;
    nextSalt: string;
    fingerprint: BinaryFingerprint;
    force?: boolean;
  }): PatchPlan;
  apply(
    plan: PatchPlan,
    options?: {
      clearConfigCache?: boolean;
      signBinary?: boolean;
      rehatchSoul?: boolean;
    },
  ): Promise<PatchReport>;
}

export interface CompanionCacheMutation {
  keysRemoved: string[];
}

export interface BackupManifestEntry {
  binaryPath: string;
  backupPath: string;
  sha256: string;
  createdAt: string;
  oldSalt: string;
  newSalt?: string;
}

export interface BackupManifest {
  schemaVersion: 1;
  latest?: BackupManifestEntry;
  history: BackupManifestEntry[];
}

export interface ClaudeRuntimeContext {
  installTarget: InstallTarget;
  currentSalt: string;
  currentRoll: BuddyRoll;
  currentSoul: CompanionSoul | null;
}
