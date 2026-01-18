import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runAptCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks,
  sudo: boolean = false
): Promise<boolean> {
  const cmd = sudo ? ["sudo", "apt-get", ...args] : ["apt-get", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class Apt implements PackageManager {
  type = "apt" as const;
  displayName = "APT";

  async isAvailable(): Promise<boolean> {
    return commandExists("apt-get");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runAptCommand(["update", "-y"], callbacks, true);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runAptCommand(["install", "-y", ...packages], callbacks, true);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runAptCommand(["remove", "-y", ...packages], callbacks, true);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages && packages.length > 0) {
      // Upgrade specific packages by reinstalling
      return runAptCommand(["install", "-y", "--only-upgrade", ...packages], callbacks, true);
    }
    // Full upgrade
    await runAptCommand(["update", "-y"], callbacks, true);
    return runAptCommand(["upgrade", "-y"], callbacks, true);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["dpkg-query", "-W", "-f=${Package} ${Version}\n"]);
    if (!result.success) return [];

    return result.stdout.split("\n").filter(Boolean).map((line) => {
      const [name, version] = line.split(" ");
      return { name, version: version || "unknown" };
    });
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    // First update package lists
    await exec(["sudo", "apt-get", "update", "-y"]);

    const result = await exec(["apt", "list", "--upgradable"]);
    if (!result.success) return [];

    return result.stdout.split("\n")
      .filter((line) => line.includes("[upgradable"))
      .map((line) => {
        // Format: "package/release version arch [upgradable from: old_version]"
        const match = line.match(/^(\S+)\/\S+\s+(\S+)\s+\S+\s+\[upgradable from:\s+(\S+)\]/);
        if (match) {
          return {
            name: match[1],
            currentVersion: match[3],
            newVersion: match[2],
          };
        }
        return null;
      })
      .filter((pkg): pkg is UpgradeInfo => pkg !== null);
  }

  async listLeaves(): Promise<string[]> {
    // apt-mark showmanual lists manually installed packages
    const result = await exec(["apt-mark", "showmanual"]);
    if (!result.success) return [];
    return result.stdout.split("\n").filter(Boolean);
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const autoremove = await runAptCommand(["autoremove", "-y"], callbacks, true);
    const autoclean = await runAptCommand(["autoclean"], callbacks, true);
    return autoremove && autoclean;
  }

  async addRepository(repo: string, callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // repo should be in PPA format: "ppa:user/repo"
    const cmd = ["sudo", "add-apt-repository", "-y", repo];
    if (callbacks?.onLog) {
      const exitCode = await execStreaming(cmd, callbacks.onLog);
      if (exitCode !== 0) return false;
    } else {
      const result = await exec(cmd);
      if (!result.success) return false;
    }

    // Update after adding repo
    return runAptCommand(["update", "-y"], callbacks, true);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    for (const pkg of packages) {
      const checkResult = await exec(["dpkg", "-s", pkg]);
      result.set(pkg, checkResult.success && checkResult.stdout.includes("Status: install ok installed"));
    }

    return result;
  }
}
