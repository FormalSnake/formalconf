import { exec } from "./shell";
import { loadPkgLock, savePkgLock, loadPkgConfig } from "./config";
import { getPlatformInfo } from "./platform";
import {
  getPackageManager,
  getAvailableManagers,
  HomebrewFormulas,
  HomebrewCasks,
} from "./package-managers";
import type { PackageManager } from "./package-managers";
import type {
  PkgLock,
  PkgLockV1,
  PkgLockV2,
  LockedFormula,
  LockedCask,
  LockedPackageV2,
  isV2Lock,
} from "../types/pkg-config";
import type { PackageManagerType } from "../types/platform";

interface BrewFormulaInfo {
  name: string;
  tap: string;
  installed: Array<{ version: string }>;
}

interface BrewCaskInfo {
  token: string;
  installed: string | null;
}

interface BrewInfoResponse {
  formulae: BrewFormulaInfo[];
  casks: BrewCaskInfo[];
}

// ============================================================================
// V2 Lockfile Functions
// ============================================================================

export async function fetchInstalledVersionsV2(): Promise<Record<string, LockedPackageV2>> {
  const platform = await getPlatformInfo();
  const config = await loadPkgConfig();
  const now = new Date().toISOString();

  const packages: Record<string, LockedPackageV2> = {};

  const managers = await getAvailableManagers();

  for (const manager of managers) {
    const installed = await manager.listInstalled();

    for (const pkg of installed) {
      // Create a unique key for each package (manager:name)
      const key = `${manager.type}:${pkg.name}`;
      packages[key] = {
        version: pkg.version,
        installedAt: pkg.installedAt || now,
        manager: manager.type,
      };
    }
  }

  // For Homebrew, add tap info for formulas
  if (platform.os === "darwin") {
    const formulaPackages = config.macos?.formulas || [];
    const globalPackages = config.global?.packages || [];
    const allFormulas = [...globalPackages, ...formulaPackages];

    if (allFormulas.length > 0) {
      const result = await exec([
        "brew",
        "info",
        "--json=v2",
        ...allFormulas,
      ]);
      if (result.success && result.stdout) {
        try {
          const info: BrewInfoResponse = JSON.parse(result.stdout);
          for (const formula of info.formulae) {
            if (formula.installed.length > 0) {
              const key = `homebrew:${formula.name}`;
              if (packages[key]) {
                packages[key].tap = formula.tap;
              }
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  }

  return packages;
}

export async function generateLockfileV2(): Promise<PkgLockV2> {
  const packages = await fetchInstalledVersionsV2();

  return {
    version: 2,
    lastUpdated: new Date().toISOString(),
    packages,
  };
}

export async function updateLockfile(): Promise<PkgLock> {
  const existing = await loadPkgLock();
  const packages = await fetchInstalledVersionsV2();

  // Merge with existing lock, preserving installedAt for unchanged packages
  const mergedPackages: Record<string, LockedPackageV2> = {};

  for (const [key, info] of Object.entries(packages)) {
    if (existing?.version === 2) {
      const prev = existing.packages[key];
      if (prev && prev.version === info.version) {
        mergedPackages[key] = prev;
      } else {
        mergedPackages[key] = info;
      }
    } else if (existing?.version === 1) {
      // Migration from v1: try to match by name
      const [manager, name] = key.split(":");
      let prev: LockedFormula | LockedCask | undefined;

      if (manager === "homebrew") {
        prev = existing.formulas[name];
      } else if (manager === "homebrew-casks") {
        prev = existing.casks[name];
      }

      if (prev && prev.version === info.version) {
        mergedPackages[key] = {
          ...info,
          installedAt: prev.installedAt,
        };
      } else {
        mergedPackages[key] = info;
      }
    } else {
      mergedPackages[key] = info;
    }
  }

  const lock: PkgLockV2 = {
    version: 2,
    lastUpdated: new Date().toISOString(),
    packages: mergedPackages,
  };

  await savePkgLock(lock);
  return lock;
}

// ============================================================================
// Legacy V1 Functions (for backward compatibility)
// ============================================================================

export async function fetchInstalledVersions(): Promise<{
  formulas: Record<string, LockedFormula>;
  casks: Record<string, LockedCask>;
}> {
  const config = await loadPkgConfig();
  const now = new Date().toISOString();

  const formulas: Record<string, LockedFormula> = {};
  const casks: Record<string, LockedCask> = {};

  const allFormulas = [
    ...(config.global?.packages || []),
    ...(config.macos?.formulas || []),
  ];

  if (allFormulas.length > 0) {
    const result = await exec([
      "brew",
      "info",
      "--json=v2",
      ...allFormulas,
    ]);
    if (result.success && result.stdout) {
      const info: BrewInfoResponse = JSON.parse(result.stdout);
      for (const formula of info.formulae) {
        if (formula.installed.length > 0) {
          formulas[formula.name] = {
            version: formula.installed[0].version,
            tap: formula.tap,
            installedAt: now,
          };
        }
      }
    }
  }

  const allCasks = config.macos?.casks || [];
  if (allCasks.length > 0) {
    const result = await exec([
      "brew",
      "info",
      "--json=v2",
      "--cask",
      ...allCasks,
    ]);
    if (result.success && result.stdout) {
      const info: BrewInfoResponse = JSON.parse(result.stdout);
      for (const cask of info.casks) {
        if (cask.installed) {
          casks[cask.token] = {
            version: cask.installed,
            installedAt: now,
          };
        }
      }
    }
  }

  return { formulas, casks };
}

export async function generateLockfile(): Promise<PkgLockV1> {
  const { formulas, casks } = await fetchInstalledVersions();

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    formulas,
    casks,
  };
}

// ============================================================================
// Change Detection
// ============================================================================

export async function getChangedPackages(): Promise<{
  added: string[];
  removed: string[];
  upgraded: Array<{ name: string; from: string; to: string }>;
}> {
  const existing = await loadPkgLock();
  const packages = await fetchInstalledVersionsV2();

  const added: string[] = [];
  const removed: string[] = [];
  const upgraded: Array<{ name: string; from: string; to: string }> = [];

  if (!existing) {
    added.push(...Object.keys(packages));
    return { added, removed, upgraded };
  }

  if (existing.version === 2) {
    // V2 comparison
    for (const [key, info] of Object.entries(packages)) {
      if (!existing.packages[key]) {
        added.push(key);
      } else if (existing.packages[key].version !== info.version) {
        upgraded.push({
          name: key,
          from: existing.packages[key].version,
          to: info.version,
        });
      }
    }
    for (const key of Object.keys(existing.packages)) {
      if (!packages[key]) {
        removed.push(key);
      }
    }
  } else {
    // V1 comparison (legacy)
    const { formulas, casks } = await fetchInstalledVersions();

    for (const [name, info] of Object.entries(formulas)) {
      if (!existing.formulas[name]) {
        added.push(name);
      } else if (existing.formulas[name].version !== info.version) {
        upgraded.push({
          name,
          from: existing.formulas[name].version,
          to: info.version,
        });
      }
    }
    for (const name of Object.keys(existing.formulas)) {
      if (!formulas[name]) {
        removed.push(name);
      }
    }

    for (const [name, info] of Object.entries(casks)) {
      if (!existing.casks[name]) {
        added.push(name);
      } else if (existing.casks[name].version !== info.version) {
        upgraded.push({
          name,
          from: existing.casks[name].version,
          to: info.version,
        });
      }
    }
    for (const name of Object.keys(existing.casks)) {
      if (!casks[name]) {
        removed.push(name);
      }
    }
  }

  return { added, removed, upgraded };
}
