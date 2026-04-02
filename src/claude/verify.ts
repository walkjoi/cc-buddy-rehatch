import { readFileSync } from "fs";

import { createHashBackend } from "../core/hash";
import { rollFromSalt, matchesTarget } from "../core/roll";
import type { InstallTarget, RehatchTarget, VerifyReport } from "../core/types";
import { readCompanionSoul } from "./config";
import { detectCurrentSalt } from "./salt-detect";

export function verifyCurrentBuddy(installTarget: InstallTarget, target?: RehatchTarget): VerifyReport {
  const currentSalt = detectCurrentSalt(readFileSync(installTarget.binaryPath));
  if (!currentSalt) {
    throw new Error("Could not detect the current buddy salt");
  }

  const currentRoll = rollFromSalt(
    installTarget.userId,
    currentSalt,
    createHashBackend(installTarget.hashBackendName),
  );
  const report: VerifyReport = {
    schemaVersion: 1,
    ok: target ? matchesTarget(currentRoll, target) : true,
    binaryPath: installTarget.binaryPath,
    configPath: installTarget.configPath,
    targetRuntime: installTarget.targetRuntime,
    hashBackendName: installTarget.hashBackendName,
    currentSalt,
    currentRoll,
    currentSoul: readCompanionSoul(installTarget.configPath),
    matchesTarget: target ? matchesTarget(currentRoll, target) : true,
  };
  if (target) {
    report.target = target;
  }
  return report;
}
