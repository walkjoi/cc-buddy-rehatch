import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { computeBinaryFingerprint } from "../src/claude/fingerprint";

describe("computeBinaryFingerprint", () => {
  test("recognizes a target when the current salt is detectable even with sparse markers", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-buddy-rehatch-fingerprint-"));
    const binaryPath = join(dir, "claude-sparse.js");
    writeFileSync(binaryPath, 'minified bundle inspirationSeed var NV_="friend-2026-aan"; function vC(){return q.companion}');

    const fingerprint = computeBinaryFingerprint(binaryPath);

    expect(fingerprint.markersFound).toEqual(["inspirationSeed"]);
    expect(fingerprint.recognized).toBe(true);
  });
});
