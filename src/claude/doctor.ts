import { readFileSync } from "fs";

import type { DoctorIssue, DoctorReport } from "../core/types";
import { detectCurrentSalt } from "./salt-detect";
import { isClaudeRunning } from "./install";
import { resolveInstallTarget, type ResolveContextOptions } from "./target";

export function runDoctor(options: ResolveContextOptions = {}): DoctorReport {
  const issues: DoctorIssue[] = [];
  const suggestions: string[] = [];

  try {
    const installTarget = resolveInstallTarget(options);
    const currentSalt = detectCurrentSalt(readFileSync(installTarget.binaryPath));
    if (!installTarget.fingerprint.recognized) {
      issues.push({
        code: "WEAK_FINGERPRINT",
        message: "Binary marker evidence is weak; patching will require --force.",
        recoverable: true,
      });
      suggestions.push("Run inspect to review markers and fingerprint before patching.");
    }
    if (!currentSalt) {
      issues.push({
        code: "MISSING_SALT",
        message: "Could not detect the current buddy salt in the binary.",
        recoverable: false,
      });
      suggestions.push("Check whether Claude Code changed its internal buddy implementation.");
    }
    if (installTarget.userId === "anon") {
      issues.push({
        code: "ANON_USER",
        message: "No stable Claude user ID was found; buddy results may change after login.",
        recoverable: true,
      });
      suggestions.push("Log into Claude Code before rehatching for stable results.");
    }
    if (isClaudeRunning()) {
      issues.push({
        code: "CLAUDE_RUNNING",
        message: "Claude Code appears to be running and may hold the binary open.",
        recoverable: true,
      });
      suggestions.push("Quit Claude Code before applying a patch.");
    }

    const report: DoctorReport = {
      schemaVersion: 1,
      ok: issues.every((issue) => issue.recoverable),
      binaryPath: installTarget.binaryPath,
      configPath: installTarget.configPath,
      userIdPreview: installTarget.userIdPreview,
      fingerprint: installTarget.fingerprint,
      issues,
      suggestions,
    };
    if (currentSalt) {
      report.currentSalt = currentSalt;
    }
    return report;
  } catch (error) {
    issues.push({
      code: "DISCOVERY_FAILED",
      message: error instanceof Error ? error.message : "Unknown discovery failure",
      recoverable: false,
    });
    suggestions.push("Run with --binary-path and --config-path to specify the target explicitly.");
    return {
      schemaVersion: 1,
      ok: false,
      issues,
      suggestions,
    };
  }
}
