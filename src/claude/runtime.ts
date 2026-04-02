import { closeSync, openSync, readSync } from "fs";

import type { ClaudeTargetRuntime, SupportedHashBackendName } from "../core/types";

const HEADER_BYTES = 512;

function readHeader(binaryPath: string): string {
  const fd = openSync(binaryPath, "r");
  try {
    const buffer = Buffer.alloc(HEADER_BYTES);
    const bytesRead = readSync(fd, buffer, 0, buffer.byteLength, 0);
    return buffer.subarray(0, bytesRead).toString("utf-8");
  } finally {
    closeSync(fd);
  }
}

export function inferTargetRuntime(binaryPath: string): ClaudeTargetRuntime {
  try {
    const firstLine = readHeader(binaryPath).split(/\r?\n/u, 1)[0] ?? "";
    if (!firstLine.startsWith("#!")) {
      return "unknown";
    }
    if (/\bnode\b/u.test(firstLine)) {
      return "node";
    }
    if (/\bbun\b/u.test(firstLine)) {
      return "bun";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

export function selectHashBackendName(targetRuntime: ClaudeTargetRuntime): SupportedHashBackendName {
  return targetRuntime === "bun" ? "bun-hash" : "fnv1a-32";
}
