import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { clearCompanionCache, readUserId } from "../src/claude/config";

describe("config helpers", () => {
  test("removes companion cache keys while preserving other values", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-config-"));
    const configPath = join(dir, ".claude.json");
    writeFileSync(
      configPath,
      `{\n  "oauthAccount": { "accountUuid": "user-123" },\n  "theme": "dark",\n  "companion": { "salt": "friend-2026-401" },\n  "companionMuted": false\n}\n`,
    );

    const mutation = clearCompanionCache(configPath);
    const nextRaw = readFileSync(configPath, "utf-8");

    expect(mutation.keysRemoved).toEqual(["companionMuted"]);
    expect(nextRaw).toContain('"theme": "dark"');
    expect(nextRaw).toContain('"companion"');
    expect(nextRaw).toContain('"salt": "friend-2026-401"');
    expect(nextRaw).not.toContain('"companionMuted"');
    expect(readUserId(configPath)).toBe("user-123");
  });

  test("removes the companion soul only when rehatchSoul is enabled", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-config-"));
    const configPath = join(dir, ".claude.json");
    writeFileSync(
      configPath,
      `{\n  "oauthAccount": { "accountUuid": "user-123" },\n  "companion": { "name": "Tomewhisk", "personality": "A bookish penguin." },\n  "companionMuted": false\n}\n`,
    );

    const mutation = clearCompanionCache(configPath, { rehatchSoul: true });
    const nextRaw = readFileSync(configPath, "utf-8");

    expect(mutation.keysRemoved).toEqual(["companionMuted", "companion"]);
    expect(nextRaw).not.toContain('"companionMuted"');
    expect(nextRaw).not.toContain('"companion"');
  });
});
