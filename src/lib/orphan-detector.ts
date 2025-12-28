import { exec } from "./shell";
import { loadPkgConfig, savePkgConfig } from "./config";
import type { OrphanedPackage, OrphanDetectionResult } from "../types/pkg-config";

// Extract package name from potentially tap-prefixed name
// e.g., "oven-sh/bun/bun" -> "bun", "git" -> "git"
function getPackageName(fullName: string): string {
  const parts = fullName.split("/");
  return parts[parts.length - 1];
}

export async function detectOrphanedPackages(): Promise<OrphanDetectionResult> {
  const config = await loadPkgConfig();

  // Get user-installed formulas (not dependencies)
  const leavesResult = await exec(["brew", "leaves"]);
  const installedLeaves = leavesResult.success
    ? leavesResult.stdout.split("\n").filter(Boolean)
    : [];

  // Get installed casks
  const casksResult = await exec(["brew", "list", "--cask"]);
  const installedCasks = casksResult.success
    ? casksResult.stdout.split("\n").filter(Boolean)
    : [];

  const orphans: OrphanedPackage[] = [];

  // Build list of config package names (both full and short forms)
  const configPackages = config.packages.map((pkg) => ({
    full: pkg,
    short: getPackageName(pkg),
  }));

  // Find orphaned formulas - check various matching strategies
  for (const installed of installedLeaves) {
    const installedShort = getPackageName(installed);
    const isInConfig = configPackages.some(
      (cfg) =>
        // Exact match (full or short)
        installed === cfg.full ||
        installed === cfg.short ||
        installedShort === cfg.full ||
        installedShort === cfg.short ||
        // Tap-prefixed match: "tap/repo/pkg" ends with "/pkg"
        installed.endsWith(`/${cfg.short}`)
    );
    if (!isInConfig) {
      orphans.push({ name: installed, type: "formula" });
    }
  }

  // Find orphaned casks
  const configCasksSet = new Set(config.casks);
  for (const cask of installedCasks) {
    if (!configCasksSet.has(cask)) {
      orphans.push({ name: cask, type: "cask" });
    }
  }

  // Sort orphans by type then name
  orphans.sort((a, b) => {
    if (a.type !== b.type) return a.type === "formula" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    orphans,
    configFormulas: config.packages.length,
    configCasks: config.casks.length,
    installedLeaves: installedLeaves.length,
    installedCasks: installedCasks.length,
  };
}

export async function addToConfig(pkg: OrphanedPackage): Promise<void> {
  const config = await loadPkgConfig();

  if (pkg.type === "formula") {
    if (!config.packages.includes(pkg.name)) {
      config.packages.push(pkg.name);
      config.packages.sort();
    }
  } else {
    if (!config.casks.includes(pkg.name)) {
      config.casks.push(pkg.name);
      config.casks.sort();
    }
  }

  await savePkgConfig(config);
}

export async function uninstallPackage(pkg: OrphanedPackage): Promise<boolean> {
  const cmd =
    pkg.type === "cask"
      ? ["brew", "uninstall", "--cask", pkg.name]
      : ["brew", "uninstall", pkg.name];
  const result = await exec(cmd);
  return result.success;
}
