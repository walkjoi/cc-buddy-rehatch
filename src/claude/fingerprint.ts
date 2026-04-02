import { createHash } from "crypto";
import { readFileSync } from "fs";

import { BINARY_MARKERS, ORIGINAL_SALT } from "../core/constants";
import type { BinaryFingerprint } from "../core/types";
import { detectCurrentSalt } from "./salt-detect";

export function computeBinaryFingerprint(binaryPath: string): BinaryFingerprint {
  const buffer = readFileSync(binaryPath);
  const text = buffer.toString("latin1");
  const markersFound = BINARY_MARKERS.filter((marker) => text.includes(marker));
  const hasOriginalSalt = text.includes(ORIGINAL_SALT);
  const currentSalt = detectCurrentSalt(buffer);

  return {
    sha256: createHash("sha256").update(buffer).digest("hex"),
    size: buffer.byteLength,
    markersFound,
    hasOriginalSalt,
    recognized: Boolean(currentSalt) || hasOriginalSalt || markersFound.length >= 2,
  };
}
