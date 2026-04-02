import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

import { detectCurrentSalt } from "../src/claude/salt-detect";

describe("detectCurrentSalt", () => {
  test("finds the original salt from a fixture binary blob", () => {
    const fixture = readFileSync(join(import.meta.dir, "..", "fixtures", "mock-binary.txt"));
    expect(detectCurrentSalt(fixture)).toBe("friend-2026-401");
  });

  test("finds a previously patched x-prefixed salt", () => {
    const data = Buffer.from('something "xxxxxxxx00000042" rollRarity CompanionBones');
    expect(detectCurrentSalt(data)).toBe("xxxxxxx00000042");
  });
});
