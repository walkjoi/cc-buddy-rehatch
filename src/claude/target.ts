import { readFileSync } from "fs";

import { computeBinaryFingerprint } from "./fingerprint";
import { findBinaryPath, findConfigPath, getDefaultBackupDir, previewUserId } from "./install";
import { readCompanionSoul, readUserId } from "./config";
import { inferTargetRuntime, selectHashBackendName } from "./runtime";
import { detectCurrentSalt } from "./salt-detect";
import { rollFromSalt } from "../core/roll";
import { createHashBackend } from "../core/hash";
import type { ClaudeRuntimeContext, InspectReport, InstallTarget } from "../core/types";

export interface ResolveContextOptions {
  binaryPath?: string;
  configPath?: string;
  backupDir?: string;
}

export function resolveInstallTarget(options: ResolveContextOptions = {}): InstallTarget {
  const binaryPath = findBinaryPath(options.binaryPath);
  if (!binaryPath) {
    throw new Error("Could not find Claude Code binary. Use --binary-path to specify it.");
  }

  const configPath = findConfigPath(options.configPath);
  if (!configPath) {
    throw new Error("Could not find Claude Code config file. Use --config-path to specify it.");
  }

  const userId = readUserId(configPath);
  const fingerprint = computeBinaryFingerprint(binaryPath);
  const targetRuntime = inferTargetRuntime(binaryPath);
  const hashBackendName = selectHashBackendName(targetRuntime);
  return {
    binaryPath,
    configPath,
    backupDir: options.backupDir ?? getDefaultBackupDir(),
    userId,
    userIdPreview: previewUserId(userId),
    targetRuntime,
    hashBackendName,
    fingerprint,
  };
}

export function resolveRuntimeContext(options: ResolveContextOptions = {}): ClaudeRuntimeContext {
  const installTarget = resolveInstallTarget(options);
  const currentSalt = detectCurrentSalt(readFileSync(installTarget.binaryPath));
  if (!currentSalt) {
    throw new Error("Could not detect the current buddy salt");
  }

  return {
    installTarget,
    currentSalt,
    currentRoll: rollFromSalt(
      installTarget.userId,
      currentSalt,
      createHashBackend(installTarget.hashBackendName),
    ),
    currentSoul: readCompanionSoul(installTarget.configPath),
  };
}

export function buildInspectReport(options: ResolveContextOptions = {}): InspectReport {
  const context = resolveRuntimeContext(options);
  return {
    schemaVersion: 1,
    installTarget: context.installTarget,
    currentSalt: context.currentSalt,
    currentRoll: context.currentRoll,
    currentSoul: context.currentSoul,
  };
}
