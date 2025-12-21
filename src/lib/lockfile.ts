import { exec } from "./shell";
import { loadPkgLock, savePkgLock, loadPkgConfig } from "./config";
import type { PkgLock, LockedFormula, LockedCask } from "../types/pkg-config";

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

export async function fetchInstalledVersions(): Promise<{
  formulas: Record<string, LockedFormula>;
  casks: Record<string, LockedCask>;
}> {
  const config = await loadPkgConfig();
  const now = new Date().toISOString();

  const formulas: Record<string, LockedFormula> = {};
  const casks: Record<string, LockedCask> = {};

  if (config.packages.length > 0) {
    const result = await exec([
      "brew",
      "info",
      "--json=v2",
      ...config.packages,
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

  if (config.casks.length > 0) {
    const result = await exec([
      "brew",
      "info",
      "--json=v2",
      "--cask",
      ...config.casks,
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

export async function generateLockfile(): Promise<PkgLock> {
  const { formulas, casks } = await fetchInstalledVersions();

  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    formulas,
    casks,
  };
}

export async function updateLockfile(): Promise<PkgLock> {
  const existing = await loadPkgLock();
  const { formulas, casks } = await fetchInstalledVersions();

  const mergedFormulas: Record<string, LockedFormula> = {};
  for (const [name, info] of Object.entries(formulas)) {
    const prev = existing?.formulas[name];
    if (prev && prev.version === info.version) {
      mergedFormulas[name] = prev;
    } else {
      mergedFormulas[name] = info;
    }
  }

  const mergedCasks: Record<string, LockedCask> = {};
  for (const [name, info] of Object.entries(casks)) {
    const prev = existing?.casks[name];
    if (prev && prev.version === info.version) {
      mergedCasks[name] = prev;
    } else {
      mergedCasks[name] = info;
    }
  }

  const lock: PkgLock = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    formulas: mergedFormulas,
    casks: mergedCasks,
  };

  await savePkgLock(lock);
  return lock;
}

export async function getChangedPackages(): Promise<{
  added: string[];
  removed: string[];
  upgraded: Array<{ name: string; from: string; to: string }>;
}> {
  const existing = await loadPkgLock();
  const { formulas, casks } = await fetchInstalledVersions();

  const added: string[] = [];
  const removed: string[] = [];
  const upgraded: Array<{ name: string; from: string; to: string }> = [];

  if (!existing) {
    added.push(...Object.keys(formulas), ...Object.keys(casks));
    return { added, removed, upgraded };
  }

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

  return { added, removed, upgraded };
}
