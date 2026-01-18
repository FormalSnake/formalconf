import { exec, commandExists } from "../runtime";
import { execStreaming, execLive } from "../runtime";
import { detectAurHelper } from "../platform";
import type { AurHelper } from "../../types/platform";
import type { PackageManager, PackageInfo, UpgradeInfo, PackageManagerCallbacks } from "./types";

async function runAurCommand(
  helper: AurHelper,
  args: string[],
  callbacks?: PackageManagerCallbacks
): Promise<boolean> {
  if (helper === "none") return false;

  const cmd = [helper, ...args];
  if (callbacks?.onLog) {
    const exitCode = await execStreaming(cmd, callbacks.onLog);
    return exitCode === 0;
  }
  const result = await exec(cmd);
  return result.success;
}

export class AurPackageManager implements PackageManager {
  type = "aur" as const;
  displayName = "AUR";

  private helper: AurHelper = "none";
  private helperDetected = false;

  private async getHelper(): Promise<AurHelper> {
    if (!this.helperDetected) {
      this.helper = await detectAurHelper();
      this.helperDetected = true;
    }
    return this.helper;
  }

  async isAvailable(): Promise<boolean> {
    const helper = await this.getHelper();
    return helper !== "none";
  }

  async ensureAurHelper(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const helper = await this.getHelper();
    if (helper !== "none") return true;

    const log = callbacks?.onLog || console.log;
    log("No AUR helper found. Installing yay...");

    // Check prerequisites
    const hasGit = await commandExists("git");
    const hasMakepkg = await commandExists("makepkg");
    const hasBaseDevel = await exec(["pacman", "-Qq", "base-devel"]);

    if (!hasGit) {
      log("Installing git...");
      const gitResult = await exec(["sudo", "pacman", "-S", "--noconfirm", "git"]);
      if (!gitResult.success) {
        log("Failed to install git");
        return false;
      }
    }

    if (!hasBaseDevel.success) {
      log("Installing base-devel...");
      const baseResult = await exec(["sudo", "pacman", "-S", "--noconfirm", "base-devel"]);
      if (!baseResult.success) {
        log("Failed to install base-devel");
        return false;
      }
    }

    // Clone and build yay
    const tmpDir = "/tmp/yay-install";

    // Clean up any existing directory
    await exec(["rm", "-rf", tmpDir]);

    log("Cloning yay from AUR...");
    const cloneResult = await exec(["git", "clone", "https://aur.archlinux.org/yay.git", tmpDir]);
    if (!cloneResult.success) {
      log(`Failed to clone yay: ${cloneResult.stderr}`);
      return false;
    }

    log("Building and installing yay...");
    const buildExitCode = await execLive(["makepkg", "-si", "--noconfirm"], tmpDir);
    if (buildExitCode !== 0) {
      log("Failed to build yay");
      return false;
    }

    // Clean up
    await exec(["rm", "-rf", tmpDir]);

    // Update cached helper
    this.helper = "yay";
    log("yay installed successfully!");
    return true;
  }

  async update(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const helper = await this.getHelper();
    if (helper === "none") return false;

    // AUR helpers update both official and AUR packages
    return runAurCommand(helper, ["-Sy"], callbacks);
  }

  async install(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    const helper = await this.getHelper();
    if (helper === "none") {
      const installed = await this.ensureAurHelper(callbacks);
      if (!installed) return false;
    }

    const currentHelper = await this.getHelper();
    return runAurCommand(currentHelper, ["-S", "--noconfirm", "--needed", ...packages], callbacks);
  }

  async uninstall(packages: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    if (packages.length === 0) return true;

    const helper = await this.getHelper();
    if (helper === "none") return false;

    return runAurCommand(helper, ["-Rs", "--noconfirm", ...packages], callbacks);
  }

  async upgrade(packages?: string[], callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const helper = await this.getHelper();
    if (helper === "none") return false;

    if (packages && packages.length > 0) {
      return runAurCommand(helper, ["-S", "--noconfirm", ...packages], callbacks);
    }

    // Full system upgrade including AUR
    return runAurCommand(helper, ["-Syu", "--noconfirm"], callbacks);
  }

  async listInstalled(): Promise<PackageInfo[]> {
    // List foreign packages (AUR and other non-repo packages)
    const result = await exec(["pacman", "-Qm"]);
    if (!result.success) return [];

    return result.stdout.split("\n").filter(Boolean).map((line) => {
      const [name, version] = line.split(" ");
      return { name, version: version || "unknown" };
    });
  }

  async listOutdated(): Promise<UpgradeInfo[]> {
    const helper = await this.getHelper();
    if (helper === "none") return [];

    // Use the helper to check for updates
    const result = await exec([helper, "-Qua"]);
    if (!result.success || !result.stdout) return [];

    return result.stdout.split("\n").filter(Boolean).map((line) => {
      // Format varies by helper but usually: "package current -> new"
      const match = line.match(/^(\S+)\s+(\S+)\s+->\s+(\S+)$/);
      if (match) {
        return {
          name: match[1],
          currentVersion: match[2],
          newVersion: match[3],
        };
      }
      return { name: line.split(" ")[0], currentVersion: "unknown", newVersion: "unknown" };
    });
  }

  async cleanup(callbacks?: PackageManagerCallbacks): Promise<boolean> {
    const helper = await this.getHelper();
    if (helper === "none") return true;

    // Clean AUR build cache
    return runAurCommand(helper, ["-Sc", "--noconfirm"], callbacks);
  }

  async isInstalled(packages: string[]): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    const listResult = await exec(["pacman", "-Qmq"]);
    const installed = new Set(listResult.stdout.split("\n").filter(Boolean));

    for (const pkg of packages) {
      result.set(pkg, installed.has(pkg));
    }

    return result;
  }

  getHelperName(): Promise<AurHelper> {
    return this.getHelper();
  }
}
