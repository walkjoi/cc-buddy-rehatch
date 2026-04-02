import { buildInspectReport } from "../claude/target";
import { formatCompanionCard } from "../sprites/render";
import type { CommonCommandOptions } from "./shared";

export async function runInspectCommand(options: CommonCommandOptions): Promise<void> {
  const report = buildInspectReport(options);
  if (options.json) {
    console.log(JSON.stringify({ schemaVersion: 1, command: "inspect", data: report }, null, 2));
    return;
  }

  console.log(`Binary:      ${report.installTarget.binaryPath}`);
  console.log(`Config:      ${report.installTarget.configPath}`);
  console.log(`Backup dir:  ${report.installTarget.backupDir}`);
  console.log(`Runtime:     ${report.installTarget.targetRuntime}`);
  console.log(`Hash:        ${report.installTarget.hashBackendName}`);
  console.log(`User ID:     ${report.installTarget.userIdPreview}`);
  console.log(`SHA-256:     ${report.installTarget.fingerprint.sha256}`);
  console.log(`Markers:     ${report.installTarget.fingerprint.markersFound.join(", ") || "(none)"}`);
  console.log(`Recognized:  ${report.installTarget.fingerprint.recognized ? "yes" : "no"}`);
  console.log(`Salt:        ${report.currentSalt}`);
  if (report.currentSoul) {
    console.log(`Name:        ${report.currentSoul.name}`);
    console.log(`Soul:        ${report.currentSoul.personality}`);
  } else {
    console.log("Soul:        (pending rehatch; run /buddy in Claude Code)");
  }
  console.log("\nCurrent buddy:");
  console.log(formatCompanionCard(report.currentRoll));
}
