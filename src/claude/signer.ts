import { execSync } from "child_process";
import { platform } from "os";

export function resignBinary(binaryPath: string): boolean {
  if (platform() !== "darwin") {
    return false;
  }

  try {
    execSync(`codesign -s - --force "${binaryPath}" 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}
