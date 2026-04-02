import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";

import type { BackupManifest, BackupManifestEntry, BinaryFingerprint } from "../core/types";

const MANIFEST_NAME = "manifest.json";

export function ensureBackupDir(backupDir: string): void {
  mkdirSync(backupDir, { recursive: true });
}

function timestampToken(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function getManifestPath(backupDir: string): string {
  return join(backupDir, MANIFEST_NAME);
}

export function getNextBackupPath(backupDir: string, binaryPath: string, fingerprint: BinaryFingerprint): string {
  const safeName = basename(binaryPath);
  return join(backupDir, `${safeName}.${timestampToken()}.${fingerprint.sha256.slice(0, 12)}.backup`);
}

export function loadManifest(backupDir: string): BackupManifest {
  const manifestPath = getManifestPath(backupDir);
  if (!existsSync(manifestPath)) {
    return { schemaVersion: 1, history: [] };
  }

  return JSON.parse(readFileSync(manifestPath, "utf-8")) as BackupManifest;
}

export function saveManifest(backupDir: string, manifest: BackupManifest): void {
  ensureBackupDir(backupDir);
  writeFileSync(getManifestPath(backupDir), JSON.stringify(manifest, null, 2) + "\n");
}

export function recordBackup(backupDir: string, entry: BackupManifestEntry): void {
  const manifest = loadManifest(backupDir);
  manifest.latest = entry;
  manifest.history.push(entry);
  saveManifest(backupDir, manifest);
}

export function createBinaryBackup(
  binaryPath: string,
  backupDir: string,
  fingerprint: BinaryFingerprint,
  oldSalt: string,
): string {
  ensureBackupDir(backupDir);
  const backupPath = getNextBackupPath(backupDir, binaryPath, fingerprint);
  copyFileSync(binaryPath, backupPath);
  recordBackup(backupDir, {
    binaryPath,
    backupPath,
    sha256: fingerprint.sha256,
    createdAt: new Date().toISOString(),
    oldSalt,
  });
  return backupPath;
}

export function findLatestBackup(backupDir: string, binaryPath?: string): BackupManifestEntry | null {
  const manifest = loadManifest(backupDir);
  if (manifest.latest && (!binaryPath || manifest.latest.binaryPath === binaryPath)) {
    return manifest.latest;
  }

  const reversed = [...manifest.history].reverse();
  return reversed.find((entry) => !binaryPath || entry.binaryPath === binaryPath) ?? null;
}

export function restoreBinaryFromBackup(binaryPath: string, backupPath: string): void {
  copyFileSync(backupPath, binaryPath);
}
