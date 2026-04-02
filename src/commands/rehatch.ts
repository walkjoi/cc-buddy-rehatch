import { SaltReplacePatchBackend } from "../claude/patch-salt";
import { resolveRuntimeContext } from "../claude/target";
import { verifyCurrentBuddy } from "../claude/verify";
import { clearCompanionCache } from "../claude/config";
import { findLatestBackup, restoreBinaryFromBackup } from "../claude/backup";
import { WorkerPoolSearchBackend } from "../core/search";
import { matchesTarget } from "../core/roll";
import { formatCompanionCard } from "../sprites/render";
import { runInteractiveRehatchUI } from "../ui/app";
import type { RehatchCommandOptions } from "./shared";
import { formatTarget, hasExplicitTarget, parseRehatchTarget, resolveRehatchScope } from "./shared";

export async function runRehatchCommand(options: RehatchCommandOptions): Promise<void> {
  const scope = resolveRehatchScope(options);
  const target = parseRehatchTarget(options);
  if (!hasExplicitTarget(target)) {
    const context = resolveRuntimeContext(options);
    if (scope.soulOnly) {
      const mutation = clearCompanionCache(context.installTarget.configPath, { rehatchSoul: true });
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              schemaVersion: 1,
              command: "rehatch",
              data: {
                scope,
                soulRehatched: true,
                installTarget: context.installTarget,
                currentSalt: context.currentSalt,
                currentRoll: context.currentRoll,
                currentSoul: context.currentSoul,
                clearedConfigKeys: mutation.keysRemoved,
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      console.log("Rehatched soul for the current buddy.");
      console.log(`Cleared config keys: ${mutation.keysRemoved.join(", ") || "(none)"}`);
      console.log("Run /buddy in Claude Code to generate a new name and personality for the current appearance.");
      console.log(formatCompanionCard(context.currentRoll));
      return;
    }

    const searchBackend = new WorkerPoolSearchBackend();
    const patchBackend = new SaltReplacePatchBackend();
    await runInteractiveRehatchUI({
      context,
      searchBackend,
      patchBackend,
      onRestore: async () => {
        const backup = findLatestBackup(context.installTarget.backupDir, context.installTarget.binaryPath);
        if (!backup) {
          return ["No backup found. Nothing to restore."];
        }
        restoreBinaryFromBackup(context.installTarget.binaryPath, backup.backupPath);
        const mutation = clearCompanionCache(context.installTarget.configPath, {
          rehatchSoul: Boolean(options.rehatchSoul || options.soulOnly),
        });
        return [
          `Restored binary from ${backup.backupPath}`,
          mutation.keysRemoved.length > 0
            ? `Cleared config keys: ${mutation.keysRemoved.join(", ")}`
            : "No config cache keys needed clearing",
          ...(options.rehatchSoul || options.soulOnly ? ["Next /buddy will rehatch a new name and personality."] : []),
        ];
      },
      force: Boolean(options.force),
      noSign: Boolean(options.noSign),
      rehatchSoul: scope.rehatchSoul,
      timeoutMs: options.timeout ?? 0,
    });
    return;
  }

  const context = resolveRuntimeContext(options);
  if (scope.soulOnly) {
    if (!matchesTarget(context.currentRoll, target)) {
      throw new Error("The current buddy does not match the requested appearance. Remove --soul-only to rehatch appearance too.");
    }
    if (!context.currentSoul) {
      throw new Error("No existing companion soul was found to rehatch. Run /buddy in Claude Code first.");
    }

    const soulMutation = clearCompanionCache(context.installTarget.configPath, { rehatchSoul: true });
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            schemaVersion: 1,
            command: "rehatch",
            data: {
              scope,
              soulRehatched: true,
              clearedConfigKeys: soulMutation.keysRemoved,
              installTarget: context.installTarget,
              currentSalt: context.currentSalt,
              currentRoll: context.currentRoll,
              currentSoul: context.currentSoul,
              target,
            },
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log("Rehatched soul for the current appearance target.");
    console.log(`Cleared config keys: ${soulMutation.keysRemoved.join(", ") || "(none)"}`);
    console.log("Run /buddy in Claude Code to generate a new name and personality for the current appearance.");
    console.log(formatCompanionCard(context.currentRoll));
    return;
  }

  const searchBackend = new WorkerPoolSearchBackend();
  const patchBackend = new SaltReplacePatchBackend();
  const searchOptions =
    options.json
      ? {
          ...(options.timeout ? { timeoutMs: options.timeout } : {}),
          hashBackendName: context.installTarget.hashBackendName,
          excludeSalt: context.currentSalt,
        }
      : {
          ...(options.timeout ? { timeoutMs: options.timeout } : {}),
          hashBackendName: context.installTarget.hashBackendName,
          excludeSalt: context.currentSalt,
          onProgress: (progress: { checked: number; elapsedMs: number }) => {
            if (progress.checked % 1_000_000 < 250_000) {
              console.log(
                `Searching: ${(progress.checked / 1e6).toFixed(1)}M checked (${(progress.elapsedMs / 1000).toFixed(1)}s)`,
              );
            }
          },
        };
  const found = await searchBackend.find(context.installTarget.userId, target, searchOptions);

  if (!found) {
    throw new Error(`No matching salt found for target ${formatTarget(target)}`);
  }

  const plan = patchBackend.createPlan({
    binaryPath: context.installTarget.binaryPath,
    configPath: context.installTarget.configPath,
    backupDir: context.installTarget.backupDir,
    currentSalt: context.currentSalt,
    nextSalt: found.salt,
    fingerprint: context.installTarget.fingerprint,
    ...(options.force !== undefined ? { force: options.force } : {}),
  });
  const patchReport = await patchBackend.apply(plan, {
    signBinary: !options.noSign,
    rehatchSoul: scope.rehatchSoul,
  });
  const verifyReport = verifyCurrentBuddy(context.installTarget, target);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: "rehatch",
          data: {
            scope,
            target,
            found,
            patchReport,
            verifyReport,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Target:  ${formatTarget(target)}`);
  console.log(`Scope:   ${scope.soulOnly ? "soul-only" : scope.rehatchSoul ? "full" : "appearance-only"}`);
  console.log(`Runtime: ${context.installTarget.targetRuntime}`);
  console.log(`Hash:    ${context.installTarget.hashBackendName}`);
  console.log(`Found:   ${found.salt} in ${found.checked.toLocaleString()} attempts (${(found.elapsedMs / 1000).toFixed(1)}s)`);
  console.log(formatCompanionCard(found.result));
  console.log(`Backup:  ${patchReport.backupPath}`);
  console.log(`Patched: ${patchReport.replacements} occurrence(s)`);
  console.log(`Verify:  ${verifyReport.matchesTarget ? "match" : "mismatch"}`);
  if (scope.rehatchSoul) {
    console.log("Soul:    pending rehatch on next /buddy");
  }
}
