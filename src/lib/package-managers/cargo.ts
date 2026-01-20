import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runCargoCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks
): Promise<boolean> {
  const cmd = ["cargo", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class Cargo implements PackageManager {
  type = "cargo" as const;
  displayName = "Cargo";

  async isAvailable(): Promise<boolean> {
    return commandExists("cargo");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Cargo doesn't have a separate update command
    return true;
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    for (const pkg of packages) {
      const success = await runCargoCommand(["install", pkg], callbacks);
      if (!success) return false;
    }
    return true;
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    for (const pkg of packages) {
      const success = await runCargoCommand(["uninstall", pkg], callbacks);
      if (!success) return false;
    }
    return true;
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Cargo upgrade is done by reinstalling with --force
    if (packages && packages.length > 0) {
      for (const pkg of packages) {
        const success = await runCargoCommand(["install", "--force", pkg], callbacks);
        if (!success) return false;
      }
      return true;
    }

    // Upgrade all installed packages
    const installed = await this.listInstalled();
    for (const pkg of installed) {
      await runCargoCommand(["install", "--force", pkg.name], callbacks);
    }
    return true;
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["cargo", "install", "--list"]);
    if (!result.success) return [];

    const packages: PackageInfo[] = [];
    const lines = result.stdout.split("\n");

    for (const line of lines) {
      // Match lines like "package_name v1.2.3:" or "package_name v1.2.3 (path/to/source):"
      const match = line.match(/^(\S+)\s+v([\d.]+(?:-[\w.]+)?)/);
      if (match) {
        packages.push({
          name: match[1],
          version: match[2],
        });
      }
    }

    return packages;
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    // Cargo doesn't have a built-in way to check for outdated packages
    // We would need to query crates.io for each package, which is expensive
    // For now, return empty - users can use `cargo install --force` to update
    return [];
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Cargo doesn't have a cleanup command like other package managers
    // Could potentially clean ~/.cargo/registry/cache but that's risky
    return true;
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const installed = await this.listInstalled();
    const installedSet = new Set(installed.map((p) => p.name));

    for (const pkg of packages) {
      result.set(pkg, installedSet.has(pkg));
    }

    return result;
  }
}
