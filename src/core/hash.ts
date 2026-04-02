import type { ClaudeTargetRuntime, HashBackend, SupportedHashBackendName } from "./types";

export class BunHashBackend implements HashBackend {
  public readonly name = "bun-hash";

  public hash32(input: string): number {
    if (typeof Bun === "undefined" || typeof Bun.hash !== "function") {
      throw new Error("Bun.hash is not available in this runtime");
    }

    return Number(BigInt(Bun.hash(input)) & 0xffffffffn);
  }
}

export class Fnv1aHashBackend implements HashBackend {
  public readonly name = "fnv1a-32";

  public hash32(input: string): number {
    let hash = 0x811c9dc5;
    const bytes = new TextEncoder().encode(input);
    for (const value of bytes) {
      hash ^= value;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
  }
}

export class StaticHashBackend implements HashBackend {
  public readonly name = "static-map";

  public constructor(private readonly values: Record<string, number>) {}

  public hash32(input: string): number {
    const value = this.values[input];
    if (value === undefined) {
      throw new Error(`No static hash fixture for "${input}"`);
    }
    return value;
  }
}

export function createHashBackend(name: SupportedHashBackendName): HashBackend {
  if (name === "bun-hash") {
    return new BunHashBackend();
  }

  return new Fnv1aHashBackend();
}

export function getDefaultHashBackend(targetRuntime: ClaudeTargetRuntime = "unknown"): HashBackend {
  if (targetRuntime === "bun" && typeof Bun !== "undefined" && typeof Bun.hash === "function") {
    return createHashBackend("bun-hash");
  }

  return createHashBackend("fnv1a-32");
}
