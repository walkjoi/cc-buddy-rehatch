import { runDoctor } from "../claude/doctor";
import type { CommonCommandOptions } from "./shared";

export async function runDoctorCommand(options: CommonCommandOptions): Promise<void> {
  const report = runDoctor(options);
  if (options.json) {
    console.log(JSON.stringify({ schemaVersion: 1, command: "doctor", data: report }, null, 2));
    return;
  }

  console.log(`Doctor status: ${report.ok ? "ok" : "needs attention"}`);
  if (report.binaryPath) console.log(`Binary:        ${report.binaryPath}`);
  if (report.configPath) console.log(`Config:        ${report.configPath}`);
  if (report.userIdPreview) console.log(`User ID:       ${report.userIdPreview}`);
  if (report.fingerprint) {
    console.log(`Recognized:    ${report.fingerprint.recognized ? "yes" : "no"}`);
    console.log(`Markers:       ${report.fingerprint.markersFound.join(", ") || "(none)"}`);
  }
  if (report.currentSalt) console.log(`Current salt:  ${report.currentSalt}`);
  if (report.issues.length > 0) {
    console.log("\nIssues:");
    for (const issue of report.issues) {
      console.log(`- ${issue.code}: ${issue.message}${issue.recoverable ? " (recoverable)" : ""}`);
    }
  }
  if (report.suggestions.length > 0) {
    console.log("\nSuggestions:");
    for (const suggestion of report.suggestions) {
      console.log(`- ${suggestion}`);
    }
  }
}
