import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

interface BrewFormulaInfo {
  name: string;
  full_name: string;
  tap: string;
  installed: Array<{ version: string; installed_on_request: boolean }>;
}

interface BrewCaskInfo {
  token: string;
  installed: string | null;
}

interface BrewInfoResponse {
  formulae: BrewFormulaInfo[];
  casks: BrewCaskInfo[];
}

async function runBrewCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks
): Promise<boolean> {
  const cmd = ["brew", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class HomebrewFormulas implements PackageManager {
  type = "homebrew" as const;
  displayName = "Homebrew Formulas";

  async isAvailable(): Promise<boolean> {
    return commandExists("brew");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runBrewCommand(["update"], callbacks);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runBrewCommand(["install", ...packages], callbacks);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runBrewCommand(["uninstall", ...packages], callbacks);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const args = ["upgrade", "--formula"];
    if (packages && packages.length > 0) {
      args.push(...packages);
    }
    return runBrewCommand(args, callbacks);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["brew", "info", "--json=v2", "--installed"]);
    if (!result.success) return [];

    try {
      const info: BrewInfoResponse = JSON.parse(result.stdout);
      return info.formulae.map((f) => ({
        name: f.name,
        version: f.installed[0]?.version || "unknown",
      }));
    } catch {
      return [];
    }
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    const result = await exec(["brew", "outdated", "--formula", "--json"]);
    if (!result.success || !result.stdout) return [];

    try {
      const outdated = JSON.parse(result.stdout);
      return outdated.formulae?.map((f: { name: string; installed_versions: string[]; current_version: string }) => ({
        name: f.name,
        currentVersion: f.installed_versions?.[0] || "unknown",
        newVersion: f.current_version,
      })) || [];
    } catch {
      // Fallback to quiet mode
      const quietResult = await exec(["brew", "outdated", "--formula", "--quiet"]);
      if (!quietResult.success) return [];
      return quietResult.stdout.split("\n").filter(Boolean).map((name) => ({
        name,
        currentVersion: "unknown",
        newVersion: "unknown",
      }));
    }
  }

  async listLeaves(): Promise<string[]> {
    const result = await exec(["brew", "leaves"]);
    if (!result.success) return [];
    return result.stdout.split("\n").filter(Boolean);
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const autoremove = await runBrewCommand(["autoremove"], callbacks);
    const cleanup = await runBrewCommand(["cleanup"], callbacks);
    return autoremove && cleanup;
  }

  async addRepository(repo: string, callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runBrewCommand(["tap", repo], callbacks);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["brew", "list", "--formula"]);
    const installed = new Set(listResult.stdout.split("\n").filter(Boolean));

    for (const pkg of packages) {
      // Handle tap-prefixed names like "oven-sh/bun/bun" -> "bun"
      const shortName = pkg.split("/").pop() || pkg;
      result.set(pkg, installed.has(shortName) || installed.has(pkg));
    }

    return result;
  }

  async getTappedRepos(): Promise<string[]> {
    const result = await exec(["brew", "tap"]);
    if (!result.success) return [];
    return result.stdout.split("\n").filter(Boolean);
  }

  async hasDependents(pkg: string): Promise<boolean> {
    const result = await exec(["brew", "uses", "--installed", pkg]);
    return result.success && result.stdout.trim().length > 0;
  }
}

export class HomebrewCasks implements PackageManager {
  type = "homebrew" as const;
  displayName = "Homebrew Casks";

  async isAvailable(): Promise<boolean> {
    return commandExists("brew");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runBrewCommand(["update"], callbacks);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runBrewCommand(["install", "--cask", ...packages], callbacks);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runBrewCommand(["uninstall", "--cask", ...packages], callbacks);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const args = ["upgrade", "--cask", "--greedy"];
    if (packages && packages.length > 0) {
      args.push(...packages);
    }
    return runBrewCommand(args, callbacks);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["brew", "info", "--json=v2", "--cask", "--installed"]);
    if (!result.success) return [];

    try {
      const info: BrewInfoResponse = JSON.parse(result.stdout);
      return info.casks.map((c) => ({
        name: c.token,
        version: c.installed || "unknown",
      }));
    } catch {
      return [];
    }
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    const result = await exec(["brew", "outdated", "--cask", "--quiet"]);
    if (!result.success) return [];

    return result.stdout.split("\n").filter(Boolean).map((name) => ({
      name,
      currentVersion: "unknown",
      newVersion: "unknown",
    }));
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runBrewCommand(["cleanup"], callbacks);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["brew", "list", "--cask"]);
    const installed = new Set(listResult.stdout.split("\n").filter(Boolean));

    for (const pkg of packages) {
      result.set(pkg, installed.has(pkg));
    }

    return result;
  }
}
