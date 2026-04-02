import { execSync } from "child_process";
import { existsSync, readdirSync, realpathSync, statSync } from "fs";
import { homedir, platform } from "os";
import { basename, join, resolve } from "path";

export function getDefaultBackupDir(): string {
  return join(process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), "cc-buddy-rehatch");
}

export function getClaudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
}

export function findBinaryPath(explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = realpathSync(resolve(explicitPath));
    if (!existsSync(resolved)) {
      throw new Error(`Binary path does not exist: ${resolved}`);
    }
    return resolved;
  }

  const isWin = platform() === "win32";
  try {
    const command = isWin ? "where.exe claude 2>nul" : "which -a claude 2>/dev/null";
    const output = execSync(command, { encoding: "utf-8" }).trim();
    const paths = output.split("\n").map((line) => line.trim()).filter(Boolean);
    for (const candidate of paths) {
      try {
        const resolved = realpathSync(candidate);
        if (existsSync(resolved) && statSync(resolved).size > 1_000_000) {
          return resolved;
        }
      } catch {
        // Keep scanning candidates.
      }
    }
  } catch {
    // Fall back to version directories below.
  }

  const versionDirs = [
    join(homedir(), ".local", "share", "claude", "versions"),
    ...(isWin
      ? [join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Claude", "versions")]
      : []),
  ];

  for (const versionDir of versionDirs) {
    if (!existsSync(versionDir)) {
      continue;
    }

    try {
      const versions = readdirSync(versionDir).filter((entry) => !entry.includes(".backup")).sort();
      if (versions.length > 0) {
        return join(versionDir, versions[versions.length - 1]!);
      }
    } catch {
      // Ignore and keep scanning.
    }
  }

  return null;
}

export function findConfigPath(explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = realpathSync(resolve(explicitPath));
    if (!existsSync(resolved)) {
      throw new Error(`Config path does not exist: ${resolved}`);
    }
    return resolved;
  }

  const claudeDir = getClaudeConfigDir();
  const home = process.env.CLAUDE_CONFIG_DIR || homedir();
  const candidates = [
    join(claudeDir, ".config.json"),
    join(home, ".claude.json"),
    ...(platform() === "win32" && process.env.APPDATA ? [join(process.env.APPDATA, "Claude", "config.json")] : []),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function previewUserId(userId: string): string {
  if (!userId) {
    return "unknown";
  }
  return `${userId.slice(0, 8)}...`;
}

export function isClaudeRunning(): boolean {
  try {
    if (platform() === "win32") {
      const output = execSync('tasklist /FI "IMAGENAME eq claude.exe" /FO CSV 2>nul', { encoding: "utf-8" });
      return output.toLowerCase().includes("claude.exe");
    }

    const output = execSync("pgrep -af claude 2>/dev/null", { encoding: "utf-8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .some((line) => line.length > 0 && !line.includes("cc-buddy-rehatch") && !basename(line).includes("bun"));
  } catch {
    return false;
  }
}
