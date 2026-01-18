import { exec, commandExists } from "../runtime";
import { execStreaming } from "../runtime";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runFlatpakCommand(
  args: string[],
  callbacks?: PackageManagerCallbacks
): Promise<boolean> {
  const cmd = ["flatpak", ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class Flatpak implements PackageManager {
  type = "flatpak" as const;
  displayName = "Flatpak";

  async isAvailable(): Promise<boolean> {
    return commandExists("flatpak");
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Flatpak doesn't have a separate update command, upgrade handles both
    return true;
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    for (const appId of packages) {
      // Default to flathub remote
      const success = await runFlatpakCommand(
        ["install", "-y", "--noninteractive", "flathub", appId],
        callbacks
      );
      if (!success) return false;
    }
    return true;
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    for (const appId of packages) {
      const success = await runFlatpakCommand(
        ["uninstall", "-y", "--noninteractive", appId],
        callbacks
      );
      if (!success) return false;
    }
    return true;
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages && packages.length > 0) {
      for (const appId of packages) {
        const success = await runFlatpakCommand(
          ["update", "-y", "--noninteractive", appId],
          callbacks
        );
        if (!success) return false;
      }
      return true;
    }

    return runFlatpakCommand(["update", "-y", "--noninteractive"], callbacks);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    const result = await exec(["flatpak", "list", "--app", "--columns=application,version"]);
    if (!result.success) return [];

    return result.stdout.split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, version] = line.split("\t");
        return { name: name.trim(), version: version?.trim() || "unknown" };
      });
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    // Check for updates without installing
    const result = await exec(["flatpak", "remote-ls", "--updates", "--columns=application,version"]);
    if (!result.success) return [];

    return result.stdout.split("\n")
      .filter(Boolean)
      .map((line) => {
        const [name, newVersion] = line.split("\t");
        return {
          name: name.trim(),
          currentVersion: "installed",
          newVersion: newVersion?.trim() || "unknown",
        };
      });
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Remove unused runtimes and extensions
    return runFlatpakCommand(["uninstall", "-y", "--unused", "--noninteractive"], callbacks);
  }

  async addRepository(repo: string, callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Default flathub setup
    if (repo === "flathub") {
      return runFlatpakCommand(
        ["remote-add", "--if-not-exists", "flathub", "https://flathub.org/repo/flathub.flatpakrepo"],
        callbacks
      );
    }

    // Custom remote: expects "name url" format
    const [name, url] = repo.split(" ");
    if (!url) return false;

    return runFlatpakCommand(["remote-add", "--if-not-exists", name, url], callbacks);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["flatpak", "list", "--app", "--columns=application"]);
    const installed = new Set(listResult.stdout.split("\n").filter(Boolean).map((l) => l.trim()));

    for (const appId of packages) {
      result.set(appId, installed.has(appId));
    }

    return result;
  }

  async ensureFlathub(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    // Check if flathub is already configured
    const result = await exec(["flatpak", "remotes"]);
    if (result.success && result.stdout.includes("flathub")) {
      return true;
    }

    return this.addRepository("flathub", callbacks);
  }
}
