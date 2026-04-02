import { describe, expect, test } from "bun:test";

import fixtureData from "../fixtures/roll-fixtures.json";
import { BunHashBackend } from "../src/core/hash";
import { rollFromSalt } from "../src/core/roll";
import type { BuddyRoll } from "../src/core/types";

const fixtures = fixtureData as Array<{ userId: string; salt: string; roll: BuddyRoll }>;

describe("rollFromSalt", () => {
  const hashBackend = new BunHashBackend();

  for (const fixture of fixtures) {
    test(`matches golden fixture for ${fixture.userId} / ${fixture.salt}`, () => {
      expect(rollFromSalt(fixture.userId, fixture.salt, hashBackend)).toEqual(fixture.roll);
    });
  }
});
