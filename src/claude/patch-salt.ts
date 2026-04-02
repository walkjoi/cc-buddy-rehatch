import { readFileSync, writeFileSync } from "fs";

import { createBinaryBackup, getNextBackupPath } from "./backup";
import { clearCompanionCache } from "./config";
import { detectCurrentSalt } from "./salt-detect";
import { resignBinary } from "./signer";
import type { PatchBackend, PatchPlan, PatchReport } from "../core/types";

function replaceSaltBytes(binaryPath: string, oldSalt: string, newSalt: string): number {
  if (oldSalt.length !== newSalt.length) {
    throw new Error(`Salt length mismatch: "${oldSalt}" (${oldSalt.length}) vs "${newSalt}" (${newSalt.length})`);
  }

  const data = readFileSync(binaryPath);
  const oldBuffer = Buffer.from(oldSalt);
  const newBuffer = Buffer.from(newSalt);
  let count = 0;
  let offset = 0;
  while (true) {
    const index = data.indexOf(oldBuffer, offset);
    if (index === -1) {
      break;
    }
    newBuffer.copy(data, index);
    count += 1;
    offset = index + newBuffer.length;
  }

  if (count === 0) {
    throw new Error(`Salt "${oldSalt}" not found in binary`);
  }

  writeFileSync(binaryPath, data);
  return count;
}

export class SaltReplacePatchBackend implements PatchBackend {
  public readonly name = "salt-replace";

  public createPlan(input: {
    binaryPath: string;
    configPath: string;
    backupDir: string;
    currentSalt: string;
    nextSalt: string;
    fingerprint: { recognized: boolean; sha256: string; size: number; markersFound: string[]; hasOriginalSalt: boolean };
    force?: boolean;
  }): PatchPlan {
    // A detected current salt is already a strong enough signal that we found
    // the live buddy seed in the target file, even if minification stripped
    // most human-readable markers from the bundle.
    if (!input.fingerprint.recognized && !input.force) {
      throw new Error("Claude Code binary does not have enough marker evidence for safe patching. Re-run with --force to override.");
    }

    return {
      backendName: this.name,
      binaryPath: input.binaryPath,
      configPath: input.configPath,
      backupDir: input.backupDir,
      backupPath: getNextBackupPath(input.backupDir, input.binaryPath, input.fingerprint),
      oldSalt: input.currentSalt,
      newSalt: input.nextSalt,
      fingerprint: input.fingerprint,
    };
  }

  public async apply(
    plan: PatchPlan,
    options: { clearConfigCache?: boolean; signBinary?: boolean; rehatchSoul?: boolean } = {},
  ): Promise<PatchReport> {
    const backupPath = createBinaryBackup(plan.binaryPath, plan.backupDir, plan.fingerprint, plan.oldSalt);
    const replacements = replaceSaltBytes(plan.binaryPath, plan.oldSalt, plan.newSalt);
    const detectedSalt = detectCurrentSalt(readFileSync(plan.binaryPath));
    if (detectedSalt !== plan.newSalt) {
      throw new Error(`Post-patch verification failed: expected "${plan.newSalt}", found "${detectedSalt ?? "unknown"}"`);
    }

    const signed = options.signBinary === false ? false : resignBinary(plan.binaryPath);
    const mutation =
      options.clearConfigCache === false
        ? { keysRemoved: [] }
        : clearCompanionCache(plan.configPath, {
            ...(options.rehatchSoul !== undefined ? { rehatchSoul: options.rehatchSoul } : {}),
          });

    return {
      schemaVersion: 1,
      success: true,
      backendName: this.name,
      binaryPath: plan.binaryPath,
      backupPath,
      oldSalt: plan.oldSalt,
      newSalt: plan.newSalt,
      replacements,
      signed,
      clearedConfigKeys: mutation.keysRemoved,
    };
  }
}
