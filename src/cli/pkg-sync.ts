import { parseArgs } from "util";
import { exec, commandExists } from "../lib/shell";
import { execStreaming, execStreamingWithTTY } from "../lib/runtime";
import { loadPkgConfig } from "../lib/config";
import { updateLockfile } from "../lib/lockfile";
import { getPlatformInfo, getOS, getLinuxDistro, getPlatformDisplayName } from "../lib/platform";
import {
  getPackageManager,
  getAvailableManagers,
  HomebrewFormulas,
  HomebrewCasks,
  MacAppStore,
  Pacman,
  AurPackageManager,
  Apt,
  Dnf,
  Flatpak,
  Cargo,
} from "../lib/package-managers";
import type { PackageManager, PackageManagerCallbacks } from "../lib/package-managers";
import type { PkgConfigV2, MasApp } from "../types/pkg-config";
import type { PlatformInfo } from "../types/platform";
import { SYSTEM_APP_IDS } from "../types/pkg-config";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

export interface PkgSyncCallbacks {
  onLog: (line: string) => void;
  onPrompt: (question: string, options: string[]) => Promise<string>;
}

function createDefaultCallbacks(): PkgSyncCallbacks {
  return {
    onLog: (line) => console.log(line),
    onPrompt: async (question, _options) => {
      return (prompt(question) || "").trim().toLowerCase();
    },
  };
}

async function runCommand(
  command: string[],
  callbacks: PkgSyncCallbacks | null,
  cwd?: string,
  needsTTY: boolean = false
): Promise<number> {
  if (callbacks) {
    if (needsTTY) {
      return execStreamingWithTTY(command, callbacks.onLog, cwd);
    }
    return execStreaming(command, callbacks.onLog, cwd);
  }

  // Import execLive at runtime to avoid circular dependency
  const { execLive } = await import("../lib/shell");
  return execLive(command, cwd);
}

interface UpgradeResult {
  attempted: string[];
  succeeded: string[];
  failed: string[];
  stillOutdated: string[];
}

// ============================================================================
// Platform-Aware Package Resolution
// ============================================================================

interface PackageSet {
  manager: PackageManager;
  packages: string[];
  repositories?: string[];
}

async function getPackageSetsForPlatform(
  config: PkgConfigV2,
  platform: PlatformInfo
): Promise<PackageSet[]> {
  const sets: PackageSet[] = [];

  if (platform.os === "darwin") {
    // macOS: Homebrew formulas, casks, and MAS
    const formulas = getPackageManager("homebrew") as HomebrewFormulas;
    const casks = getPackageManager("homebrew-casks") as HomebrewCasks;
    const mas = getPackageManager("mas") as MacAppStore;

    // Global packages via brew
    const globalPkgs = config.global?.packages || [];
    const macosFormulas = config.macos?.formulas || [];
    const allFormulas = [...globalPkgs, ...macosFormulas];

    if (allFormulas.length > 0 || (config.macos?.taps || []).length > 0) {
      sets.push({
        manager: formulas,
        packages: allFormulas,
        repositories: config.macos?.taps,
      });
    }

    const macosCasks = config.macos?.casks || [];
    if (macosCasks.length > 0) {
      sets.push({
        manager: casks,
        packages: macosCasks,
      });
    }

    const masMappings = config.macos?.mas || {};
    const masIds = Object.values(masMappings).map(String);
    if (masIds.length > 0 && (await mas.isAvailable())) {
      sets.push({
        manager: mas,
        packages: masIds,
      });
    }

    // Cargo (cross-platform)
    const cargo = getPackageManager("cargo") as Cargo;
    const globalCargo = config.global?.cargo || [];
    const macosCargo = config.macos?.cargo || [];
    const allMacosCargo = [...globalCargo, ...macosCargo];
    if (allMacosCargo.length > 0 && (await cargo.isAvailable())) {
      sets.push({
        manager: cargo,
        packages: allMacosCargo,
      });
    }
  } else {
    // Linux
    const distro = platform.distro;

    // Get global packages
    const globalPkgs = config.global?.packages || [];
    const linuxPkgs = config.linux?.packages || [];

    if (distro === "arch") {
      // Arch Linux: pacman + AUR
      const pacman = getPackageManager("pacman") as Pacman;
      const aur = getPackageManager("aur") as AurPackageManager;

      const archPkgs = config.arch?.packages || [];
      const allPacmanPkgs = [...globalPkgs, ...linuxPkgs, ...archPkgs];

      if (allPacmanPkgs.length > 0) {
        sets.push({
          manager: pacman,
          packages: allPacmanPkgs,
        });
      }

      const aurPkgs = config.arch?.aur || [];
      if (aurPkgs.length > 0 && (await aur.isAvailable())) {
        sets.push({
          manager: aur,
          packages: aurPkgs,
        });
      }
    } else if (distro === "debian" || distro === "ubuntu") {
      // Debian/Ubuntu: apt
      const apt = getPackageManager("apt") as Apt;

      const debianPkgs = config.debian?.packages || [];
      const allAptPkgs = [...globalPkgs, ...linuxPkgs, ...debianPkgs];

      if (allAptPkgs.length > 0 || (config.debian?.ppas || []).length > 0) {
        sets.push({
          manager: apt,
          packages: allAptPkgs,
          repositories: config.debian?.ppas,
        });
      }
    } else if (distro === "fedora" || distro === "rhel") {
      // Fedora/RHEL: dnf
      const dnf = getPackageManager("dnf") as Dnf;

      const fedoraPkgs = config.fedora?.packages || [];
      const allDnfPkgs = [...globalPkgs, ...linuxPkgs, ...fedoraPkgs];

      if (allDnfPkgs.length > 0 || (config.fedora?.copr || []).length > 0) {
        sets.push({
          manager: dnf,
          packages: allDnfPkgs,
          repositories: config.fedora?.copr?.map((r) => `copr:${r}`),
        });
      }
    } else {
      // Unknown distro: try to use whatever package manager is available
      const managers = await getAvailableManagers();
      const primaryManager = managers.find(
        (m) => m.type === "pacman" || m.type === "apt" || m.type === "dnf"
      );

      if (primaryManager) {
        const allPkgs = [...globalPkgs, ...linuxPkgs];
        if (allPkgs.length > 0) {
          sets.push({
            manager: primaryManager,
            packages: allPkgs,
          });
        }
      }
    }

    // Flatpak (cross-distro)
    const flatpak = getPackageManager("flatpak") as Flatpak;
    const flatpakApps = config.linux?.flatpak || [];
    if (flatpakApps.length > 0 && (await flatpak.isAvailable())) {
      sets.push({
        manager: flatpak,
        packages: flatpakApps,
      });
    }

    // Cargo (cross-platform)
    const cargo = getPackageManager("cargo") as Cargo;
    const globalCargo = config.global?.cargo || [];
    const linuxCargo = config.linux?.cargo || [];
    const allLinuxCargo = [...globalCargo, ...linuxCargo];
    if (allLinuxCargo.length > 0 && (await cargo.isAvailable())) {
      sets.push({
        manager: cargo,
        packages: allLinuxCargo,
      });
    }
  }

  return sets;
}

// ============================================================================
// Dependency Check
// ============================================================================

async function checkDependencies(platform: PlatformInfo): Promise<void> {
  if (platform.os === "darwin") {
    if (!(await commandExists("brew"))) {
      console.error(`${colors.red}Error: Homebrew not installed${colors.reset}`);
      process.exit(1);
    }
  } else {
    // Linux: check for at least one package manager
    const hasPackageManager = await Promise.all([
      commandExists("pacman"),
      commandExists("apt"),
      commandExists("dnf"),
    ]).then((results) => results.some(Boolean));

    if (!hasPackageManager) {
      console.error(
        `${colors.red}Error: No supported package manager found (pacman, apt, or dnf)${colors.reset}`
      );
      process.exit(1);
    }
  }
}

// ============================================================================
// Upgrade Functions
// ============================================================================

async function upgradeWithVerification(
  cb: PkgSyncCallbacks | null = null
): Promise<UpgradeResult> {
  const log = cb?.onLog ?? console.log;
  const platform = await getPlatformInfo();

  const result: UpgradeResult = {
    attempted: [],
    succeeded: [],
    failed: [],
    stillOutdated: [],
  };

  const callbacks: PackageManagerCallbacks | undefined = cb
    ? { onLog: cb.onLog }
    : undefined;

  log(`\n${colors.cyan}=== Checking for updates ===${colors.reset}\n`);

  const managers = await getAvailableManagers();

  for (const manager of managers) {
    log(`\n${colors.cyan}--- ${manager.displayName} ---${colors.reset}\n`);

    // Update package lists
    await manager.update(callbacks);

    // Get outdated packages
    const outdated = await manager.listOutdated();

    if (outdated.length === 0) {
      log(`${colors.green}All packages are up to date${colors.reset}`);
      continue;
    }

    log(`${colors.yellow}Found ${outdated.length} outdated packages${colors.reset}\n`);
    result.attempted.push(...outdated.map((p) => p.name));

    // Upgrade all
    await manager.upgrade(undefined, callbacks);

    // Verify upgrades
    const stillOutdated = await manager.listOutdated();
    const stillOutdatedSet = new Set(stillOutdated.map((p) => p.name));

    for (const pkg of outdated) {
      if (stillOutdatedSet.has(pkg.name)) {
        result.stillOutdated.push(pkg.name);
      } else {
        result.succeeded.push(pkg.name);
      }
    }

    // Retry failed upgrades individually
    if (result.stillOutdated.length > 0) {
      log(
        `${colors.yellow}${result.stillOutdated.length} packages still outdated, retrying individually...${colors.reset}\n`
      );

      for (const pkgName of [...result.stillOutdated]) {
        log(`  Retrying ${colors.blue}${pkgName}${colors.reset}...`);

        const upgradeSuccess = await manager.upgrade([pkgName], callbacks);
        const checkOutdated = await manager.listOutdated();
        const stillFailing = checkOutdated.some((p) => p.name === pkgName);

        if (!stillFailing) {
          result.succeeded.push(pkgName);
          result.stillOutdated = result.stillOutdated.filter((n) => n !== pkgName);
          log(`    ${colors.green}✓ Success${colors.reset}`);
        } else {
          result.failed.push(pkgName);
          result.stillOutdated = result.stillOutdated.filter((n) => n !== pkgName);
          log(`    ${colors.red}✗ Failed${colors.reset}`);
        }
      }
    }
  }

  // Cleanup
  log(`\n${colors.cyan}=== Cleanup ===${colors.reset}\n`);
  for (const manager of managers) {
    await manager.cleanup(callbacks);
  }

  // Update lockfile
  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  const lock = await updateLockfile();
  const lockTotal =
    lock.version === 2
      ? Object.keys(lock.packages).length
      : Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
  log(`  Locked ${lockTotal} packages`);

  return result;
}

async function upgradeInteractive(cb: PkgSyncCallbacks | null = null): Promise<void> {
  const log = cb?.onLog ?? console.log;
  const askPrompt = cb?.onPrompt ?? (async (q: string) => (prompt(q) || "").trim().toLowerCase());

  const callbacks: PackageManagerCallbacks | undefined = cb
    ? { onLog: cb.onLog }
    : undefined;

  const managers = await getAvailableManagers();

  for (const manager of managers) {
    log(`\n${colors.cyan}=== ${manager.displayName} ===${colors.reset}\n`);

    await manager.update(callbacks);

    const outdated = await manager.listOutdated();

    if (outdated.length === 0) {
      log(`${colors.green}All packages are up to date${colors.reset}\n`);
      continue;
    }

    log(`${colors.yellow}Found ${outdated.length} outdated packages${colors.reset}\n`);

    for (const pkg of outdated) {
      const question = `Upgrade ${colors.blue}${pkg.name}${colors.reset} (${pkg.currentVersion} -> ${pkg.newVersion})?`;
      const answer = await askPrompt(question, ["y", "n", "q"]);

      if (answer === "q") {
        log(`\n${colors.yellow}Upgrade cancelled${colors.reset}`);
        return;
      }
      if (answer === "y" || answer === "yes") {
        await manager.upgrade([pkg.name], callbacks);
      }
    }
  }

  // Cleanup
  for (const manager of managers) {
    await manager.cleanup(callbacks);
  }

  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  await updateLockfile();
}

// ============================================================================
// Sync Functions
// ============================================================================

async function syncPackages(
  config: PkgConfigV2,
  cb: PkgSyncCallbacks | null = null
): Promise<void> {
  const log = cb?.onLog ?? console.log;
  const platform = await getPlatformInfo();

  const callbacks: PackageManagerCallbacks | undefined = cb
    ? { onLog: cb.onLog }
    : undefined;

  log(`\n${colors.cyan}Platform: ${getPlatformDisplayName(platform)}${colors.reset}\n`);

  // Get package sets for this platform
  const packageSets = await getPackageSetsForPlatform(config, platform);

  if (packageSets.length === 0) {
    log(`${colors.yellow}No packages configured for this platform${colors.reset}`);
    return;
  }

  // Update package managers if auto-update is enabled
  if (config.config.autoUpdate) {
    log(`\n${colors.cyan}=== Updating package managers ===${colors.reset}\n`);
    for (const set of packageSets) {
      log(`  Updating ${set.manager.displayName}...`);
      await set.manager.update(callbacks);
    }
  }

  // Process each package set
  for (const set of packageSets) {
    log(`\n${colors.cyan}=== ${set.manager.displayName} ===${colors.reset}\n`);

    // Add repositories if needed
    if (set.repositories && set.repositories.length > 0 && set.manager.addRepository) {
      log(`  Adding repositories...`);
      for (const repo of set.repositories) {
        log(`    ${colors.blue}${repo}${colors.reset}`);
        await set.manager.addRepository(repo, callbacks);
      }
    }

    // Check which packages are already installed
    if (set.packages.length === 0) {
      log(`  No packages to install`);
      continue;
    }

    const installedMap = await set.manager.isInstalled(set.packages);
    const toInstall = set.packages.filter((pkg) => !installedMap.get(pkg));

    if (toInstall.length === 0) {
      log(`  All ${set.packages.length} packages already installed`);
    } else {
      log(`  Installing ${toInstall.length} packages...`);
      for (const pkg of toInstall) {
        log(`    ${colors.blue}${pkg}${colors.reset}`);
      }
      await set.manager.install(toInstall, callbacks);
    }
  }

  // Purge if enabled
  if (config.config.purge) {
    await purgeUnlisted(config, config.config.purgeInteractive, cb);
  }

  // Update lockfile
  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  const lock = await updateLockfile();
  const lockTotal =
    lock.version === 2
      ? Object.keys(lock.packages).length
      : Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
  log(`  Locked ${lockTotal} packages`);

  log(`\n${colors.green}=== Sync complete ===${colors.reset}\n`);
}

// ============================================================================
// Purge Functions
// ============================================================================

async function purgeUnlisted(
  config: PkgConfigV2,
  interactive: boolean,
  cb: PkgSyncCallbacks | null = null
): Promise<void> {
  const log = cb?.onLog ?? console.log;
  const askPrompt = cb?.onPrompt ?? (async (q: string) => (prompt(q) || "").trim().toLowerCase());
  const platform = await getPlatformInfo();

  const callbacks: PackageManagerCallbacks | undefined = cb
    ? { onLog: cb.onLog }
    : undefined;

  log(`\n${colors.cyan}=== Checking for unlisted packages ===${colors.reset}\n`);

  const packageSets = await getPackageSetsForPlatform(config, platform);

  for (const set of packageSets) {
    const configuredSet = new Set(set.packages);

    // Get user-installed packages (leaves)
    let installedLeaves: string[];
    if (set.manager.listLeaves) {
      installedLeaves = await set.manager.listLeaves();
    } else {
      const installed = await set.manager.listInstalled();
      installedLeaves = installed.map((p) => p.name);
    }

    for (const pkg of installedLeaves) {
      // Skip if in config
      if (configuredSet.has(pkg)) continue;

      // For MAS, skip system apps
      if (set.manager.type === "mas") {
        const appId = parseInt(pkg, 10);
        if (SYSTEM_APP_IDS.includes(appId)) continue;
      }

      // For Homebrew formulas, check if it has dependents
      if (set.manager.type === "homebrew") {
        const formulas = set.manager as HomebrewFormulas;
        if (await formulas.hasDependents(pkg)) {
          log(`  ${colors.yellow}Skipping ${pkg} (has dependents)${colors.reset}`);
          continue;
        }
      }

      if (interactive) {
        const answer = await askPrompt(
          `Remove ${colors.red}${pkg}${colors.reset} (${set.manager.displayName})?`,
          ["y", "n"]
        );
        if (answer === "y") {
          await set.manager.uninstall([pkg], callbacks);
        }
      } else {
        log(`  Removing: ${colors.red}${pkg}${colors.reset}`);
        await set.manager.uninstall([pkg], callbacks);
      }
    }
  }

  log(`\n${colors.cyan}=== Cleaning up ===${colors.reset}\n`);
  for (const set of packageSets) {
    await set.manager.cleanup(callbacks);
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function printUsage(): void {
  console.log(`
${colors.cyan}Usage: bun run pkg-sync [options] [config-file]${colors.reset}

Options:
  ${colors.blue}--upgrade-only${colors.reset}         Only upgrade existing packages (with verification)
  ${colors.blue}--upgrade-interactive${colors.reset}  Interactively select packages to upgrade
  ${colors.blue}--purge${colors.reset}                Force purge mode for this run

Examples:
  bun run pkg-sync                    Sync packages from pkg-config.json
  bun run pkg-sync --upgrade-only     Upgrade all packages with verification
  bun run pkg-sync --purge            Sync and remove unlisted packages
`);
}

export interface PkgSyncResult {
  output: string;
  success: boolean;
}

export async function runPkgSyncWithCallbacks(
  args: string[],
  callbacks: PkgSyncCallbacks
): Promise<PkgSyncResult> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "upgrade-only": { type: "boolean", default: false },
      "upgrade-interactive": { type: "boolean", default: false },
      purge: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  const platform = await getPlatformInfo();

  try {
    await checkDependencies(platform);
  } catch {
    callbacks.onLog(`${colors.red}Error: Required dependencies not installed${colors.reset}`);
    return { output: "Dependencies not installed", success: false };
  }

  if (values["upgrade-interactive"]) {
    await upgradeInteractive(callbacks);
    return { output: "Interactive upgrade complete", success: true };
  }

  if (values["upgrade-only"]) {
    const result = await upgradeWithVerification(callbacks);
    let output = "Upgrade complete\n";
    if (result.succeeded.length > 0) {
      output += `Upgraded: ${result.succeeded.join(", ")}\n`;
    }
    if (result.failed.length > 0) {
      output += `Failed: ${result.failed.join(", ")}`;
    }
    return { output, success: result.failed.length === 0 };
  }

  const configPath = positionals[0];
  const config = await loadPkgConfig(configPath);

  if (values.purge) {
    config.config.purge = true;
  }

  await syncPackages(config, callbacks);
  return { output: "Sync complete", success: true };
}

export async function runPkgSync(args: string[]): Promise<PkgSyncResult> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "upgrade-only": { type: "boolean", default: false },
      "upgrade-interactive": { type: "boolean", default: false },
      purge: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  const platform = await getPlatformInfo();

  try {
    await checkDependencies(platform);
  } catch {
    return { output: "Dependencies not installed", success: false };
  }

  if (values["upgrade-only"]) {
    const result = await upgradeWithVerification();
    let output = "Upgrade complete\n";
    if (result.succeeded.length > 0) {
      output += `Upgraded: ${result.succeeded.join(", ")}\n`;
    }
    if (result.failed.length > 0) {
      output += `Failed: ${result.failed.join(", ")}`;
    }
    return { output, success: result.failed.length === 0 };
  }

  const configPath = positionals[0];
  const config = await loadPkgConfig(configPath);

  if (values.purge) {
    config.config.purge = true;
  }

  await syncPackages(config);
  return { output: "Sync complete", success: true };
}

export async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      "upgrade-only": { type: "boolean", default: false },
      "upgrade-interactive": { type: "boolean", default: false },
      purge: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const platform = await getPlatformInfo();
  await checkDependencies(platform);

  if (values["upgrade-interactive"]) {
    await upgradeInteractive();
    return;
  }

  if (values["upgrade-only"]) {
    const result = await upgradeWithVerification();

    console.log(`\n${colors.bold}=== Upgrade Summary ===${colors.reset}\n`);

    if (result.succeeded.length > 0) {
      console.log(
        `${colors.green}✓ Upgraded (${result.succeeded.length}):${colors.reset} ${result.succeeded.join(", ")}`
      );
    }

    if (result.failed.length > 0) {
      console.log(
        `${colors.red}✗ Failed (${result.failed.length}):${colors.reset} ${result.failed.join(", ")}`
      );
    }

    if (result.attempted.length === 0) {
      console.log(`${colors.green}Everything is up to date!${colors.reset}`);
    } else if (result.failed.length === 0 && result.stillOutdated.length === 0) {
      console.log(`\n${colors.green}All upgrades completed successfully!${colors.reset}`);
    } else {
      console.log(
        `\n${colors.yellow}Some packages could not be upgraded. Manual intervention may be required.${colors.reset}`
      );
    }

    return;
  }

  // Default: sync packages
  const configPath = positionals[0];
  const config = await loadPkgConfig(configPath);

  if (values.purge) {
    config.config.purge = true;
  }

  await syncPackages(config);
}

// Only run main when executed directly
const isMainModule = process.argv[1]?.includes("pkg-sync");
if (isMainModule) {
  main().catch(console.error);
}
