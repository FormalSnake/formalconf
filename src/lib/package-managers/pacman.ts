import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runPacmanCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks,
  sudo: boolean = false
): Promise<boolean> {
  const cmd = sudo ? ["sudo", "pacman", ...args] : ["pacman", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class Pacman implements PackageManager {
  type = "pacman" as const;
  displayName = "Pacman";

  async isAvailable(): Promise<boolean> {
    return commandExists("pacman");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    return runPacmanCommand(["-Sy", "--noconfirm"], callbacks, true);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runPacmanCommand(["-S", "--noconfirm", "--needed", ...packages], callbacks, true);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;
    return runPacmanCommand(["-Rs", "--noconfirm", ...packages], callbacks, true);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages && packages.length > 0) {
      return runPacmanCommand(["-S", "--noconfirm", ...packages], callbacks, true);
    }
    return runPacmanCommand(["-Syu", "--noconfirm"], callbacks, true);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    // List explicitly installed packages with versions
    const result = await exec(["pacman", "-Qe"]);
    if (!result.success) return [];

    return result.stdout.split("\n").filter(Boolean).map((line) => {
      const [name, version] = line.split(" ");
      return { name, version: version || "unknown" };
    });
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    // checkupdates is part of pacman-contrib
    const checkupdatesExists = await commandExists("checkupdates");

    if (checkupdatesExists) {
      const result = await exec(["checkupdates"]);
      // checkupdates returns exit code 2 when no updates, 0 when updates available
      if (!result.stdout) return [];

      return result.stdout.split("\n").filter(Boolean).map((line) => {
        // Format: "package current_version -> new_version"
        const match = line.match(/^(\S+)\s+(\S+)\s+->\s+(\S+)$/);
        if (match) {
          return {
            name: match[1],
            currentVersion: match[2],
            newVersion: match[3],
          };
        }
        return { name: line, currentVersion: "unknown", newVersion: "unknown" };
      });
    }

    // Fallback: sync and check without actually upgrading
    await exec(["sudo", "pacman", "-Sy"]);
    const result = await exec(["pacman", "-Qu"]);
    if (!result.success || !result.stdout) return [];

    return result.stdout.split("\n").filter(Boolean).map((line) => {
      const [name, ...rest] = line.split(" ");
      const versionPart = rest.join(" ");
      const match = versionPart.match(/(\S+)\s+->\s+(\S+)/);
      return {
        name,
        currentVersion: match?.[1] || "unknown",
        newVersion: match?.[2] || "unknown",
      };
    });
  }

  async listLeaves(): Promise<string[]> {
    // List explicitly installed packages (not dependencies)
    const result = await exec(["pacman", "-Qqe"]);
    if (!result.success) return [];
    return result.stdout.split("\n").filter(Boolean);
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Remove orphaned packages (packages installed as dependencies but no longer needed)
    const orphansResult = await exec(["pacman", "-Qdtq"]);
    if (orphansResult.success && orphansResult.stdout.trim()) {
      const orphans = orphansResult.stdout.split("\n").filter(Boolean);
      if (orphans.length > 0) {
        await runPacmanCommand(["-Rs", "--noconfirm", ...orphans], callbacks, true);
      }
    }

    // Clean package cache
    return runPacmanCommand(["-Sc", "--noconfirm"], callbacks, true);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["pacman", "-Qq"]);
    const installed = new Set(listResult.stdout.split("\n").filter(Boolean));

    for (const pkg of packages) {
      result.set(pkg, installed.has(pkg));
    }

    return result;
  }
}
