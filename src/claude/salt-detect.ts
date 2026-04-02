import { ORIGINAL_SALT, SALT_LEN } from "../core/constants";

export function detectCurrentSalt(binaryData: Buffer): string | null {
  if (binaryData.includes(Buffer.from(ORIGINAL_SALT))) {
    return ORIGINAL_SALT;
  }

  const text = binaryData.toString("latin1");
  const patchedPatterns = [new RegExp(`x{${SALT_LEN - 8}}\\d{8}`, "g"), new RegExp(`friend-\\d{4}-.{${SALT_LEN - 12}}`, "g")];
  for (const pattern of patchedPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].length === SALT_LEN) {
        return match[0];
      }
    }
  }

  const saltRegex = new RegExp(`"([a-zA-Z0-9_-]{${SALT_LEN}})"`, "g");
  const candidates = new Set<string>();
  const markers = ["rollRarity", "CompanionBones", "inspirationSeed", "companionUserId"];
  for (const marker of markers) {
    const markerIndex = text.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }
    const window = text.slice(Math.max(0, markerIndex - 5_000), Math.min(text.length, markerIndex + 5_000));
    let match: RegExpExecArray | null;
    while ((match = saltRegex.exec(window)) !== null) {
      candidates.add(match[1]!);
    }
  }

  for (const candidate of candidates) {
    if (/[\d-]/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}
