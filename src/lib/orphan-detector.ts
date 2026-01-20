import { exec } from "./shell";
import { loadPkgConfig, savePkgConfig } from "./config";
import { getPlatformInfo } from "./platform";
import {
  getPackageManager,
  getAvailableManagers,
  HomebrewFormulas,
  HomebrewCasks,
  MacAppStore,
} from "./package-managers";
import type { PackageManager } from "./package-managers";
import type {
  OrphanedPackage,
  OrphanDetectionResult,
  OrphanPackageType,
  PkgConfigV2,
} from "../types/pkg-config";
import type { PackageManagerType, PlatformInfo } from "../types/platform";
import { SYSTEM_APP_IDS } from "../types/pkg-config";

// Extract package name from potentially tap-prefixed name
// e.g., "oven-sh/bun/bun" -> "bun", "git" -> "git"
function getPackageName(fullName: string): string {
  const parts = fullName.split("/");
  return parts[parts.length - 1];
}

function getOrphanPackageType(
  managerType: PackageManagerType | "homebrew-casks"
): OrphanPackageType {
  switch (managerType) {
    case "homebrew":
      return "formula";
    case "homebrew-casks":
      return "cask";
    case "mas":
      return "mas";
    case "pacman":
      return "pacman";
    case "aur":
      return "aur";
    case "apt":
      return "apt";
    case "dnf":
      return "dnf";
    case "flatpak":
      return "flatpak";
    default:
      return "formula"; // fallback
  }
}

interface ConfiguredPackages {
  manager: PackageManager;
  configuredPackages: Set<string>;
}

async function getConfiguredPackagesForPlatform(
  config: PkgConfigV2,
  platform: PlatformInfo
): Promise<ConfiguredPackages[]> {
  const result: ConfiguredPackages[] = [];

  if (platform.os === "darwin") {
    // macOS: Homebrew formulas, casks, and MAS
    const formulas = getPackageManager("homebrew") as HomebrewFormulas;
    const casks = getPackageManager("homebrew-casks") as HomebrewCasks;

    // Global + macOS formulas
    const globalPkgs = config.global?.packages || [];
    const macosFormulas = config.macos?.formulas || [];
    const allFormulas = [...globalPkgs, ...macosFormulas];

    if (await formulas.isAvailable()) {
      result.push({
        manager: formulas,
        configuredPackages: new Set(allFormulas.map((p) => getPackageName(p))),
      });
    }

    // Casks
    const macosCasks = config.macos?.casks || [];
    if (await casks.isAvailable()) {
      result.push({
        manager: casks,
        configuredPackages: new Set(macosCasks),
      });
    }

    // MAS (using app IDs)
    const mas = getPackageManager("mas");
    const masMappings = config.macos?.mas || {};
    const masIds = Object.values(masMappings).map(String);
    if (await mas.isAvailable()) {
      result.push({
        manager: mas,
        configuredPackages: new Set(masIds),
      });
    }
  } else {
    // Linux
    const distro = platform.distro;

    // Global + Linux packages
    const globalPkgs = config.global?.packages || [];
    const linuxPkgs = config.linux?.packages || [];

    if (distro === "arch") {
      const pacman = getPackageManager("pacman");
      const aur = getPackageManager("aur");

      const archPkgs = config.arch?.packages || [];
      const allPacmanPkgs = [...globalPkgs, ...linuxPkgs, ...archPkgs];

      if (await pacman.isAvailable()) {
        result.push({
          manager: pacman,
          configuredPackages: new Set(allPacmanPkgs),
        });
      }

      const aurPkgs = config.arch?.aur || [];
      if (await aur.isAvailable()) {
        result.push({
          manager: aur,
          configuredPackages: new Set(aurPkgs),
        });
      }
    } else if (distro === "debian" || distro === "ubuntu") {
      const apt = getPackageManager("apt");
      const debianPkgs = config.debian?.packages || [];
      const allAptPkgs = [...globalPkgs, ...linuxPkgs, ...debianPkgs];

      if (await apt.isAvailable()) {
        result.push({
          manager: apt,
          configuredPackages: new Set(allAptPkgs),
        });
      }
    } else if (distro === "fedora" || distro === "rhel") {
      const dnf = getPackageManager("dnf");
      const fedoraPkgs = config.fedora?.packages || [];
      const allDnfPkgs = [...globalPkgs, ...linuxPkgs, ...fedoraPkgs];

      if (await dnf.isAvailable()) {
        result.push({
          manager: dnf,
          configuredPackages: new Set(allDnfPkgs),
        });
      }
    } else {
      // Unknown distro: use available managers
      const managers = await getAvailableManagers();
      const primaryManager = managers.find(
        (m) => m.type === "pacman" || m.type === "apt" || m.type === "dnf"
      );

      if (primaryManager) {
        const allPkgs = [...globalPkgs, ...linuxPkgs];
        result.push({
          manager: primaryManager,
          configuredPackages: new Set(allPkgs),
        });
      }
    }

    // Flatpak (cross-distro)
    const flatpak = getPackageManager("flatpak");
    const flatpakApps = config.linux?.flatpak || [];
    if (await flatpak.isAvailable()) {
      result.push({
        manager: flatpak,
        configuredPackages: new Set(flatpakApps),
      });
    }
  }

  return result;
}

export async function detectOrphanedPackages(): Promise<OrphanDetectionResult> {
  const config = await loadPkgConfig();
  const platform = await getPlatformInfo();

  const orphans: OrphanedPackage[] = [];
  let totalConfigPackages = 0;
  let totalInstalledPackages = 0;

  const configuredPackagesPerManager = await getConfiguredPackagesForPlatform(
    config,
    platform
  );

  // Build MAS app name lookup for display (ID -> name)
  const masAppNames = new Map<string, string>();
  if (platform.os === "darwin") {
    const mas = getPackageManager("mas") as MacAppStore;
    if (await mas.isAvailable()) {
      const apps = await mas.getInstalledApps();
      for (const app of apps) {
        masAppNames.set(String(app.id), app.name);
      }
    }
  }

  for (const { manager, configuredPackages } of configuredPackagesPerManager) {
    totalConfigPackages += configuredPackages.size;

    // Get user-installed packages (leaves if available)
    let installedLeaves: string[];
    if (manager.listLeaves) {
      installedLeaves = await manager.listLeaves();
    } else {
      const installed = await manager.listInstalled();
      installedLeaves = installed.map((p) => p.name);
    }

    totalInstalledPackages += installedLeaves.length;

    for (const installed of installedLeaves) {
      const installedShort = getPackageName(installed);

      // Check if in config (match both full and short names)
      const isInConfig =
        configuredPackages.has(installed) ||
        configuredPackages.has(installedShort) ||
        Array.from(configuredPackages).some(
          (cfg) =>
            installed === cfg ||
            installedShort === cfg ||
            getPackageName(cfg) === installedShort ||
            installed.endsWith(`/${getPackageName(cfg)}`)
        );

      if (!isInConfig) {
        // Skip system apps for MAS
        if (manager.type === "mas") {
          const appId = parseInt(installed, 10);
          if (SYSTEM_APP_IDS.includes(appId)) continue;
        }

        // For Homebrew formulas, skip packages with dependents
        if (manager.type === "homebrew") {
          const formulas = manager as HomebrewFormulas;
          if (await formulas.hasDependents(installed)) continue;
        }

        orphans.push({
          name: installed,
          displayName:
            manager.type === "mas" ? masAppNames.get(installed) : undefined,
          type: getOrphanPackageType(manager.type),
          manager: manager.type,
        });
      }
    }
  }

  // Sort orphans by type then name
  orphans.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });

  // Calculate legacy fields for backward compatibility
  let configFormulas = 0;
  let configCasks = 0;
  let installedLeaves = 0;
  let installedCasks = 0;

  if (platform.os === "darwin") {
    configFormulas =
      (config.global?.packages?.length || 0) +
      (config.macos?.formulas?.length || 0);
    configCasks = config.macos?.casks?.length || 0;

    const formulas = getPackageManager("homebrew") as HomebrewFormulas;
    const casks = getPackageManager("homebrew-casks") as HomebrewCasks;

    if (await formulas.isAvailable()) {
      const leaves = await formulas.listLeaves?.();
      installedLeaves = leaves?.length || 0;
    }

    if (await casks.isAvailable()) {
      const caskList = await casks.listInstalled();
      installedCasks = caskList.length;
    }
  }

  return {
    orphans,
    configPackages: totalConfigPackages,
    installedPackages: totalInstalledPackages,
    // Legacy fields
    configFormulas,
    configCasks,
    installedLeaves,
    installedCasks,
  };
}

export async function addToConfig(pkg: OrphanedPackage): Promise<void> {
  const config = await loadPkgConfig();
  const platform = await getPlatformInfo();

  if (platform.os === "darwin") {
    if (pkg.type === "formula") {
      const formulas = config.macos?.formulas || [];
      if (!formulas.includes(pkg.name)) {
        config.macos = config.macos || {};
        config.macos.formulas = [...formulas, pkg.name].sort();
      }
    } else if (pkg.type === "cask") {
      const casks = config.macos?.casks || [];
      if (!casks.includes(pkg.name)) {
        config.macos = config.macos || {};
        config.macos.casks = [...casks, pkg.name].sort();
      }
    } else if (pkg.type === "mas") {
      const masApps = config.macos?.mas || {};
      const appId = parseInt(pkg.name, 10);
      const appName = pkg.displayName || pkg.name;
      // Check if this ID is already in config
      const existingIds = Object.values(masApps);
      if (!existingIds.includes(appId)) {
        config.macos = config.macos || {};
        config.macos.mas = { ...masApps, [appName]: appId };
      }
    }
  } else {
    // Linux
    if (pkg.type === "pacman") {
      const packages = config.arch?.packages || [];
      if (!packages.includes(pkg.name)) {
        config.arch = config.arch || {};
        config.arch.packages = [...packages, pkg.name].sort();
      }
    } else if (pkg.type === "aur") {
      const aurPkgs = config.arch?.aur || [];
      if (!aurPkgs.includes(pkg.name)) {
        config.arch = config.arch || {};
        config.arch.aur = [...aurPkgs, pkg.name].sort();
      }
    } else if (pkg.type === "apt") {
      const packages = config.debian?.packages || [];
      if (!packages.includes(pkg.name)) {
        config.debian = config.debian || {};
        config.debian.packages = [...packages, pkg.name].sort();
      }
    } else if (pkg.type === "dnf") {
      const packages = config.fedora?.packages || [];
      if (!packages.includes(pkg.name)) {
        config.fedora = config.fedora || {};
        config.fedora.packages = [...packages, pkg.name].sort();
      }
    } else if (pkg.type === "flatpak") {
      const flatpakApps = config.linux?.flatpak || [];
      if (!flatpakApps.includes(pkg.name)) {
        config.linux = config.linux || {};
        config.linux.flatpak = [...flatpakApps, pkg.name].sort();
      }
    }
  }

  await savePkgConfig(config);
}

export async function uninstallPackage(pkg: OrphanedPackage): Promise<boolean> {
  const manager = getPackageManager(pkg.manager);
  await manager.uninstall([pkg.name]);
  return true;
}
