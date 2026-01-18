import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runDnfCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks,
  sudo: boolean = false
): Promise<boolean> {
  const cmd = sudo ? ["sudo", "dnf", ...args] : ["dnf", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class Dnf implements PackageManager {
  type = "dnf" as const;
  displayName = "DNF";

  async isAvailable(): Promise<boolean> {
    return commandExists("dnf");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runDnfCommand(["check-update", "-y"], callbacks, true);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runDnfCommand(["install", "-y", ...packages], callbacks, true);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runDnfCommand(["remove", "-y", ...packages], callbacks, true);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages && packages.length > 0) {
      return runDnfCommand(["upgrade", "-y", ...packages], callbacks, true);
    }
    return runDnfCommand(["upgrade", "-y"], callbacks, true);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["dnf", "list", "installed", "-q"]);
    if (!result.success) return [];

    return result.stdout.split("\n")
      .filter(Boolean)
      .slice(1) // Skip header line
      .map((line) => {
        // Format: "package.arch                        version                    @repo"
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const fullName = parts[0];
          const name = fullName.replace(/\.\w+$/, ""); // Remove arch suffix
          return { name, version: parts[1] };
        }
        return null;
      })
      .filter((pkg): pkg is PackageInfo => pkg !== null);
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    const result = await exec(["dnf", "check-update", "-q"]);
    // dnf check-update returns exit code 100 if updates are available
    if (!result.stdout) return [];

    return result.stdout.split("\n")
      .filter((line) => line.trim() && !line.startsWith("Last metadata"))
      .map((line) => {
        // Format: "package.arch                        new_version                    repo"
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const fullName = parts[0];
          const name = fullName.replace(/\.\w+$/, "");
          return {
            name,
            currentVersion: "installed",
            newVersion: parts[1],
          };
        }
        return null;
      })
      .filter((pkg): pkg is UpgradeInfo => pkg !== null);
  }

  async listLeaves(): Promise<string[]> {
    // dnf leaves shows packages not required by other packages
    const hasLeaves = await commandExists("dnf-leaves");
    if (hasLeaves) {
      const result = await exec(["dnf", "leaves"]);
      if (result.success) {
        return result.stdout.split("\n").filter(Boolean);
      }
    }

    // Fallback: list user-installed packages
    const result = await exec(["dnf", "repoquery", "--userinstalled", "-q"]);
    if (!result.success) return [];
    return result.stdout.split("\n")
      .filter(Boolean)
      .map((line) => line.replace(/\.\w+$/, "")); // Remove arch suffix
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const autoremove = await runDnfCommand(["autoremove", "-y"], callbacks, true);
    const clean = await runDnfCommand(["clean", "all"], callbacks, true);
    return autoremove && clean;
  }

  async addRepository(repo: string, callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // COPR format: "copr enable user/project"
    if (repo.startsWith("copr:")) {
      const coprRepo = repo.replace("copr:", "");
      return runDnfCommand(["copr", "enable", "-y", coprRepo], callbacks, true);
    }

    // Regular repo URL
    return runDnfCommand(["config-manager", "--add-repo", repo], callbacks, true);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    for (const pkg of packages) {
      const checkResult = await exec(["rpm", "-q", pkg]);
      result.set(pkg, checkResult.success);
    }

    return result;
  }
}
