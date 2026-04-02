import { describe, expect, test } from "bun:test";

import { resolveRehatchScope } from "../src/commands/shared";

describe("resolveRehatchScope", () => {
  test("defaults rehatch to a full appearance and soul refresh", () => {
    expect(resolveRehatchScope({})).toEqual({
      appearanceOnly: false,
      soulOnly: false,
      rehatchSoul: true,
    });
  });

  test("supports appearance-only refreshes", () => {
    expect(resolveRehatchScope({ appearanceOnly: true })).toEqual({
      appearanceOnly: true,
      soulOnly: false,
      rehatchSoul: false,
    });
  });

  test("supports soul-only refreshes", () => {
    expect(resolveRehatchScope({ soulOnly: true })).toEqual({
      appearanceOnly: false,
      soulOnly: true,
      rehatchSoul: true,
    });
  });

  test("rejects conflicting scope flags", () => {
    expect(() => resolveRehatchScope({ appearanceOnly: true, soulOnly: true })).toThrow(
      "Choose either --appearance-only or --soul-only, not both.",
    );
  });
});
