import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { inferTargetRuntime, selectHashBackendName } from "../src/claude/runtime";
import { resolveRuntimeContext } from "../src/claude/target";
import { BunHashBackend, Fnv1aHashBackend } from "../src/core/hash";
import { rollFromSalt } from "../src/core/roll";

describe("target runtime resolution", () => {
  test("uses fnv1a-32 for node-backed Claude targets", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-runtime-"));
    const binaryPath = join(dir, "claude.js");
    const configPath = join(dir, ".claude.json");

    writeFileSync(
      binaryPath,
      '#!/usr/bin/env node\nconst inspirationSeed="buddy"; function rollRarity(){} const salt="friend-2026-aan"; const bones="CompanionBones";\n',
    );
    writeFileSync(configPath, '{ "oauthAccount": { "accountUuid": "user-123" }, "companion": { "name": "Buddy" } }\n');

    expect(inferTargetRuntime(binaryPath)).toBe("node");
    expect(selectHashBackendName("node")).toBe("fnv1a-32");

    const context = resolveRuntimeContext({ binaryPath, configPath, backupDir: join(dir, "backups") });
    const fnvRoll = rollFromSalt("user-123", "friend-2026-aan", new Fnv1aHashBackend());
    const bunRoll = rollFromSalt("user-123", "friend-2026-aan", new BunHashBackend());

    expect(context.installTarget.targetRuntime).toBe("node");
    expect(context.installTarget.hashBackendName).toBe("fnv1a-32");
    expect(context.currentRoll).toEqual(fnvRoll);
    expect(context.currentRoll).not.toEqual(bunRoll);
  });

  test("uses bun-hash for bun-backed targets", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-runtime-"));
    const binaryPath = join(dir, "claude-bun.js");

    writeFileSync(binaryPath, "#!/usr/bin/env bun\nconsole.log('claude');\n");

    expect(inferTargetRuntime(binaryPath)).toBe("bun");
    expect(selectHashBackendName("bun")).toBe("bun-hash");
  });
});
