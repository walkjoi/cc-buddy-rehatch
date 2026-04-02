import { formatCompanionCard } from "../sprites/render";
import { resolveRuntimeContext } from "../claude/target";
import type { CommonCommandOptions } from "./shared";

export async function runCurrentCommand(options: CommonCommandOptions): Promise<void> {
  const context = resolveRuntimeContext(options);
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: "current",
          data: {
            installTarget: context.installTarget,
            currentSalt: context.currentSalt,
            currentRoll: context.currentRoll,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Binary:  ${context.installTarget.binaryPath}`);
  console.log(`Config:  ${context.installTarget.configPath}`);
  console.log(`Runtime: ${context.installTarget.targetRuntime}`);
  console.log(`Hash:    ${context.installTarget.hashBackendName}`);
  console.log(`User ID: ${context.installTarget.userIdPreview}`);
  console.log(`Salt:    ${context.currentSalt}`);
  if (context.currentSoul) {
    console.log(`Name:    ${context.currentSoul.name}`);
    console.log(`Soul:    ${context.currentSoul.personality}`);
  } else {
    console.log("Soul:    (pending rehatch; run /buddy in Claude Code)");
  }
  console.log("\nCurrent buddy:");
  console.log(formatCompanionCard(context.currentRoll));
}
