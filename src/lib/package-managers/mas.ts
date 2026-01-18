import { exec, commandExists } from "../runtime";
import { execStreamingWithTTY } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

interface MasApp {
  id: number;
  name: string;
  version?: string;
}

function parseMasOutput(output: string): MasApp[] {
  const results: MasApp[] = [];
  for (const line of output.split("\n").filter(Boolean)) {
    // Format: "1234567890   App Name (1.2.3)"
    const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([^)]+)\))?$/);
    if (match) {
      results.push({
        id: parseInt(match[1], 10),
        name: match[2].trim(),
        version: match[3],
      });
    }
  }
  return results;
}

export class MacAppStore implements PackageManager {
  type = "mas" as const;
  displayName = "Mac App Store";

  async isAvailable(): Promise<boolean> {
    return commandExists("mas");
  }

  async update(_callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // MAS doesn't have a separate update command - it's handled by macOS
    return true;
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Packages are app IDs for MAS
    if (packages.length === 0) return true;

    for (const appId of packages) {
      const cmd = ["mas", "install", appId];
      if (callbacks?.onLog) {
        const exitCode = await execStreamingWithTTY(cmd, callbacks.onLog);
        if (exitCode !== 0) return false;
      } else {
        const result = await exec(cmd);
        if (!result.success) return false;
      }
    }
    return true;
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Packages are app IDs for MAS
    if (packages.length === 0) return true;

    for (const appId of packages) {
      const cmd = ["mas", "uninstall", appId];
      if (callbacks?.onLog) {
        const exitCode = await execStreamingWithTTY(cmd, callbacks.onLog);
        if (exitCode !== 0) return false;
      } else {
        const result = await exec(cmd);
        if (!result.success) return false;
      }
    }
    return true;
  }

  async upgrade(_packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const cmd = ["mas", "upgrade"];
    if (callbacks?.onLog) {
      const exitCode = await execStreamingWithTTY(cmd, callbacks.onLog);
      return exitCode === 0;
    }
    const result = await exec(cmd);
    return result.success;
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["mas", "list"]);
    if (!result.success) return [];

    const apps = parseMasOutput(result.stdout);
    return apps.map((app) => ({
      name: String(app.id),
      version: app.version || "unknown",
    }));
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    const result = await exec(["mas", "outdated"]);
    if (!result.success) return [];

    const apps = parseMasOutput(result.stdout);
    return apps.map((app) => ({
      name: String(app.id),
      currentVersion: app.version || "unknown",
      newVersion: "available",
    }));
  }

  async cleanup(_callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // MAS doesn't have a cleanup command
    return true;
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["mas", "list"]);
    const apps = parseMasOutput(listResult.stdout);
    const installedIds = new Set(apps.map((app) => String(app.id)));

    for (const appId of packages) {
      result.set(appId, installedIds.has(appId));
    }

    return result;
  }

  async getInstalledApps(): Promise<MasApp[]> {
    const result = await exec(["mas", "list"]);
    if (!result.success) return [];
    return parseMasOutput(result.stdout);
  }
}
