import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { computeBinaryFingerprint } from "../src/claude/fingerprint";
import { SaltReplacePatchBackend } from "../src/claude/patch-salt";

describe("SaltReplacePatchBackend", () => {
  test("backs up and patches a mock binary", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-patch-"));
    const binaryPath = join(dir, "claude-mock.bin");
    const configPath = join(dir, ".claude.json");
    const backupDir = join(dir, "backups");

    writeFileSync(binaryPath, Buffer.from('rollRarity CompanionBones "friend-2026-401" friend-2026-401'));
    writeFileSync(configPath, '{ "oauthAccount": { "accountUuid": "user-123" }, "companion": { "salt": "friend-2026-401" } }\n');

    const backend = new SaltReplacePatchBackend();
    const fingerprint = computeBinaryFingerprint(binaryPath);
    const plan = backend.createPlan({
      binaryPath,
      configPath,
      backupDir,
      currentSalt: "friend-2026-401",
      nextSalt: "friend-2026-abC",
      fingerprint,
      force: true,
    });

    const report = await backend.apply(plan, { signBinary: false });
    const nextBinary = readFileSync(binaryPath, "utf-8");
    const nextConfig = readFileSync(configPath, "utf-8");

    expect(report.replacements).toBe(2);
    expect(nextBinary).toContain("friend-2026-abC");
    expect(nextBinary).not.toContain("friend-2026-401");
    expect(nextConfig).toContain('"companion"');
  });

  test("optionally removes the companion soul when rehatchSoul is requested", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-patch-"));
    const binaryPath = join(dir, "claude-mock.bin");
    const configPath = join(dir, ".claude.json");
    const backupDir = join(dir, "backups");

    writeFileSync(binaryPath, Buffer.from('rollRarity CompanionBones "friend-2026-401" friend-2026-401'));
    writeFileSync(
      configPath,
      '{ "oauthAccount": { "accountUuid": "user-123" }, "companion": { "name": "Tomewhisk", "personality": "A bookish penguin." }, "companionMuted": false }\n',
    );

    const backend = new SaltReplacePatchBackend();
    const fingerprint = computeBinaryFingerprint(binaryPath);
    const plan = backend.createPlan({
      binaryPath,
      configPath,
      backupDir,
      currentSalt: "friend-2026-401",
      nextSalt: "friend-2026-abC",
      fingerprint,
      force: true,
    });

    const report = await backend.apply(plan, { signBinary: false, rehatchSoul: true });
    const nextConfig = readFileSync(configPath, "utf-8");

    expect(report.clearedConfigKeys).toEqual(["companionMuted", "companion"]);
    expect(nextConfig).not.toContain('"companion"');
    expect(nextConfig).not.toContain('"companionMuted"');
  });
});
