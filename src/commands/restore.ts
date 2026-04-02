import { clearCompanionCache } from "../claude/config";
import { findLatestBackup, restoreBinaryFromBackup } from "../claude/backup";
import { resolveInstallTarget } from "../claude/target";
import type { CommonCommandOptions } from "./shared";

export async function runRestoreCommand(options: CommonCommandOptions): Promise<void> {
  const installTarget = resolveInstallTarget(options);
  const backup = findLatestBackup(installTarget.backupDir, installTarget.binaryPath);
  if (!backup) {
    throw new Error(`No backup found in ${installTarget.backupDir}`);
  }

  restoreBinaryFromBackup(installTarget.binaryPath, backup.backupPath);
  const mutation = clearCompanionCache(installTarget.configPath, {
    rehatchSoul: Boolean(options.rehatchSoul || options.soulOnly),
  });

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          schemaVersion: 1,
          command: "restore",
          data: {
            binaryPath: installTarget.binaryPath,
            backupPath: backup.backupPath,
            configPath: installTarget.configPath,
            clearedConfigKeys: mutation.keysRemoved,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(`Restored binary from ${backup.backupPath}`);
  console.log(`Cleared config keys: ${mutation.keysRemoved.join(", ") || "(none)"}`);
  console.log(
    options.rehatchSoul || options.soulOnly
      ? "Restart Claude Code and run /buddy to rehatch both appearance and soul from the restored binary."
      : "Restart Claude Code and run /buddy to rehatch from the restored binary.",
  );
}
