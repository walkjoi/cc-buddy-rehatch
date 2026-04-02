import { readFileSync, writeFileSync } from "fs";

import { applyEdits, modify, parse, type ParseError } from "jsonc-parser";

import type { CompanionCacheMutation, CompanionSoul } from "../core/types";

export function readConfig(configPath: string): { raw: string; data: any } {
  const raw = readFileSync(configPath, "utf-8");
  const errors: ParseError[] = [];
  const data = parse(raw, errors, { allowTrailingComma: true });
  if (errors.length > 0 || !data || typeof data !== "object") {
    throw new Error(`Unable to parse Claude config at ${configPath}`);
  }

  return { raw, data };
}

export function readUserId(configPath: string): string {
  const { data } = readConfig(configPath);
  return data.oauthAccount?.accountUuid ?? data.userID ?? "anon";
}

export function readCompanionSoul(configPath: string): CompanionSoul | null {
  const { data } = readConfig(configPath);
  const companion = data.companion;
  if (!companion || typeof companion !== "object") {
    return null;
  }
  if (typeof companion.name !== "string" || typeof companion.personality !== "string") {
    return null;
  }

  return {
    name: companion.name,
    personality: companion.personality,
    ...(typeof companion.hatchedAt === "number" ? { hatchedAt: companion.hatchedAt } : {}),
  };
}

function detectFormatting(raw: string): { insertSpaces: boolean; tabSize: number; eol: string } {
  const indentMatch = raw.match(/^([ \t]+)"/m);
  const indent = indentMatch?.[1] ?? "  ";
  return {
    insertSpaces: !indent.includes("\t"),
    tabSize: indent.includes("\t") ? 1 : indent.length,
    eol: raw.includes("\r\n") ? "\r\n" : "\n",
  };
}

export function clearCompanionCache(
  configPath: string,
  options: { rehatchSoul?: boolean } = {},
): CompanionCacheMutation {
  const { raw, data } = readConfig(configPath);
  const formatting = detectFormatting(raw);
  // Claude Code merges config.companion (name/personality/hatchedAt) with
  // current bones from the active salt. Most rehatches should preserve the
  // existing soul; when rehatchSoul is enabled we deliberately remove the
  // anchor so the next /buddy run performs a fresh hatch.
  const removableKeys = ["companionMuted", ...(options.rehatchSoul ? ["companion"] : [])].filter((key) =>
    Object.prototype.hasOwnProperty.call(data, key),
  );
  if (removableKeys.length === 0) {
    return { keysRemoved: [] };
  }

  let nextRaw = raw;
  for (const key of removableKeys) {
    const edits = modify(nextRaw, [key], undefined, {
      formattingOptions: { insertSpaces: formatting.insertSpaces, tabSize: formatting.tabSize, eol: formatting.eol },
    });
    nextRaw = applyEdits(nextRaw, edits);
  }

  writeFileSync(configPath, nextRaw.endsWith(formatting.eol) ? nextRaw : `${nextRaw}${formatting.eol}`);
  return { keysRemoved: removableKeys };
}
