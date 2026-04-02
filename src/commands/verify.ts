import { resolveInstallTarget } from "../claude/target";
import { verifyCurrentBuddy } from "../claude/verify";
import { formatCompanionCard } from "../sprites/render";
import type { CommonCommandOptions, RehatchCommandOptions } from "./shared";
import { parseRehatchTarget } from "./shared";

export async function runVerifyCommand(options: RehatchCommandOptions): Promise<void> {
  const installTarget = resolveInstallTarget(options);
  const target = parseRehatchTarget(options);
  const report = verifyCurrentBuddy(installTarget, Object.keys(target).length > 0 ? target : undefined);

  if (options.json) {
    console.log(JSON.stringify({ schemaVersion: 1, command: "verify", data: report }, null, 2));
    return;
  }

  console.log(`Verify status: ${report.ok ? "match" : "mismatch"}`);
  console.log(`Binary:        ${report.binaryPath}`);
  console.log(`Config:        ${report.configPath}`);
  console.log(`Runtime:       ${report.targetRuntime}`);
  console.log(`Hash:          ${report.hashBackendName}`);
  console.log(`Salt:          ${report.currentSalt}`);
  if (report.currentSoul) {
    console.log(`Name:          ${report.currentSoul.name}`);
    console.log(`Soul:          ${report.currentSoul.personality}`);
  } else {
    console.log("Soul:          (pending rehatch; run /buddy in Claude Code)");
  }
  if (report.target && Object.keys(report.target).length > 0) {
    console.log(`Target match:  ${report.matchesTarget ? "yes" : "no"}`);
  }
  console.log("\nCurrent buddy:");
  console.log(formatCompanionCard(report.currentRoll));
}

export async function runCurrentLikeVerify(options: CommonCommandOptions): Promise<void> {
  await runVerifyCommand(options);
}
