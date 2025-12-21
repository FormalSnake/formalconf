import { parseArgs } from "util";
import { exec, execLive, commandExists } from "../lib/shell";
import { execStreaming, execStreamingWithTTY } from "../lib/runtime";
import { loadPkgConfig } from "../lib/config";
import { updateLockfile } from "../lib/lockfile";
import type { PkgConfig, UpgradeablePackage, MasApp } from "../types/pkg-config";
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
  return execLive(command, cwd);
}

interface UpgradeResult {
  attempted: string[];
  succeeded: string[];
  failed: string[];
  stillOutdated: string[];
}

async function checkDependencies(): Promise<void> {
  if (!(await commandExists("brew"))) {
    console.error(`${colors.red}Error: Homebrew not installed${colors.reset}`);
    process.exit(1);
  }
}

async function getOutdatedPackages(): Promise<UpgradeablePackage[]> {
  const [formulas, casks] = await Promise.all([
    exec(["brew", "outdated", "--formula", "--quiet"]),
    exec(["brew", "outdated", "--cask", "--quiet"]),
  ]);

  const packages: UpgradeablePackage[] = [];

  if (formulas.stdout) {
    packages.push(
      ...formulas.stdout
        .split("\n")
        .filter(Boolean)
        .map((name) => ({ name, type: "formula" as const }))
    );
  }

  if (casks.stdout) {
    packages.push(
      ...casks.stdout
        .split("\n")
        .filter(Boolean)
        .map((name) => ({ name, type: "cask" as const }))
    );
  }

  return packages;
}

async function getOutdatedMas(): Promise<MasApp[]> {
  const result = await exec(["mas", "outdated"]);
  if (!result.success || !result.stdout) return [];

  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(|$)/);
      if (match) {
        return { id: parseInt(match[1], 10), name: match[2].trim() };
      }
      return null;
    })
    .filter((app): app is MasApp => app !== null);
}

async function upgradeWithVerification(cb: PkgSyncCallbacks | null = null): Promise<UpgradeResult> {
  const log = cb?.onLog ?? console.log;

  const result: UpgradeResult = {
    attempted: [],
    succeeded: [],
    failed: [],
    stillOutdated: [],
  };

  log(`\n${colors.cyan}=== Checking for updates ===${colors.reset}\n`);
  await runCommand(["brew", "update"], cb);

  const beforeUpgrade = await getOutdatedPackages();
  result.attempted = beforeUpgrade.map((p) => p.name);

  if (beforeUpgrade.length === 0) {
    log(`\n${colors.green}All brew packages are up to date${colors.reset}`);
  } else {
    log(`\n${colors.yellow}Found ${beforeUpgrade.length} outdated packages${colors.reset}\n`);

    log(`${colors.cyan}=== Upgrading formulas ===${colors.reset}\n`);
    await runCommand(["brew", "upgrade", "--formula"], cb);

    log(`\n${colors.cyan}=== Upgrading casks ===${colors.reset}\n`);
    await runCommand(["brew", "upgrade", "--cask", "--greedy"], cb);

    log(`\n${colors.cyan}=== Verifying upgrades ===${colors.reset}\n`);
    const afterUpgrade = await getOutdatedPackages();
    const stillOutdatedSet = new Set(afterUpgrade.map((p) => p.name));

    for (const pkg of beforeUpgrade) {
      if (stillOutdatedSet.has(pkg.name)) {
        result.stillOutdated.push(pkg.name);
      } else {
        result.succeeded.push(pkg.name);
      }
    }

    if (result.stillOutdated.length > 0) {
      log(`${colors.yellow}${result.stillOutdated.length} packages still outdated, retrying individually...${colors.reset}\n`);

      for (const pkgName of [...result.stillOutdated]) {
        const pkg = afterUpgrade.find((p) => p.name === pkgName);
        if (!pkg) continue;

        log(`  Retrying ${colors.blue}${pkgName}${colors.reset}...`);

        const upgradeCmd =
          pkg.type === "cask"
            ? ["brew", "upgrade", "--cask", pkgName]
            : ["brew", "upgrade", pkgName];

        const retryResult = await exec(upgradeCmd);

        const checkResult = await exec([
          "brew",
          "outdated",
          pkg.type === "cask" ? "--cask" : "--formula",
          "--quiet",
        ]);
        const stillOutdatedNow = checkResult.stdout.split("\n").filter(Boolean);

        if (!stillOutdatedNow.includes(pkgName)) {
          result.succeeded.push(pkgName);
          result.stillOutdated = result.stillOutdated.filter((n) => n !== pkgName);
          log(`    ${colors.green}✓ Success${colors.reset}`);
        } else {
          result.failed.push(pkgName);
          result.stillOutdated = result.stillOutdated.filter((n) => n !== pkgName);
          log(`    ${colors.red}✗ Failed${colors.reset} ${retryResult.stderr ? `(${retryResult.stderr.split("\n")[0]})` : ""}`);
        }
      }
    }
  }

  if (await commandExists("mas")) {
    const masOutdated = await getOutdatedMas();
    if (masOutdated.length > 0) {
      log(`\n${colors.cyan}=== Upgrading Mac App Store apps ===${colors.reset}\n`);
      await runCommand(["mas", "upgrade"], cb, undefined, true);
    }
  }

  log(`\n${colors.cyan}=== Cleanup ===${colors.reset}\n`);
  await runCommand(["brew", "cleanup"], cb);

  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  const lock = await updateLockfile();
  const lockTotal = Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
  log(`  Locked ${lockTotal} packages`);

  return result;
}

async function upgradeInteractive(cb: PkgSyncCallbacks | null = null): Promise<void> {
  const log = cb?.onLog ?? console.log;
  const askPrompt = cb?.onPrompt ?? (async (q: string) => (prompt(q) || "").trim().toLowerCase());

  log(`\n${colors.cyan}=== Checking for updates ===${colors.reset}\n`);
  await runCommand(["brew", "update"], cb);

  const outdated = await getOutdatedPackages();

  if (outdated.length === 0) {
    log(`\n${colors.green}All packages are up to date${colors.reset}\n`);
    return;
  }

  log(`\n${colors.yellow}Found ${outdated.length} outdated packages${colors.reset}\n`);

  for (const pkg of outdated) {
    const question = `Upgrade ${colors.blue}${pkg.name}${colors.reset} (${pkg.type})?`;
    const answer = await askPrompt(question, ["y", "n", "q"]);

    if (answer === "q") {
      log(`\n${colors.yellow}Upgrade cancelled${colors.reset}`);
      return;
    }
    if (answer === "y" || answer === "yes") {
      const cmd =
        pkg.type === "cask"
          ? ["brew", "upgrade", "--cask", pkg.name]
          : ["brew", "upgrade", pkg.name];
      await runCommand(cmd, cb);
    }
  }

  const stillOutdated = await getOutdatedPackages();
  if (stillOutdated.length > 0) {
    log(`\n${colors.yellow}Still outdated: ${stillOutdated.map((p) => p.name).join(", ")}${colors.reset}`);
  } else {
    log(`\n${colors.green}All selected packages upgraded successfully${colors.reset}`);
  }

  await runCommand(["brew", "cleanup"], cb);

  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  await updateLockfile();
}

async function syncPackages(config: PkgConfig, cb: PkgSyncCallbacks | null = null): Promise<void> {
  const log = cb?.onLog ?? console.log;

  if (config.config.autoUpdate) {
    log(`\n${colors.cyan}=== Updating Homebrew ===${colors.reset}\n`);
    await runCommand(["brew", "update"], cb);
  }

  log(`\n${colors.cyan}=== Installing taps ===${colors.reset}\n`);
  const tappedResult = await exec(["brew", "tap"]);
  const tapped = tappedResult.stdout.split("\n").filter(Boolean);

  for (const tap of config.taps) {
    if (!tapped.includes(tap)) {
      log(`  Adding tap: ${colors.blue}${tap}${colors.reset}`);
      await runCommand(["brew", "tap", tap], cb);
    }
  }

  log(`\n${colors.cyan}=== Installing packages ===${colors.reset}\n`);
  const installedFormulas = (await exec(["brew", "list", "--formula"])).stdout
    .split("\n")
    .filter(Boolean);

  for (const pkg of config.packages) {
    if (!installedFormulas.includes(pkg)) {
      log(`  Installing: ${colors.blue}${pkg}${colors.reset}`);
      await runCommand(["brew", "install", pkg], cb);
    }
  }

  log(`\n${colors.cyan}=== Installing casks ===${colors.reset}\n`);
  const installedCasks = (await exec(["brew", "list", "--cask"])).stdout
    .split("\n")
    .filter(Boolean);

  for (const cask of config.casks) {
    if (!installedCasks.includes(cask)) {
      log(`  Installing: ${colors.blue}${cask}${colors.reset}`);
      await runCommand(["brew", "install", "--cask", cask], cb);
    }
  }

  if (await commandExists("mas")) {
    log(`\n${colors.cyan}=== Installing Mac App Store apps ===${colors.reset}\n`);
    const masResult = await exec(["mas", "list"]);
    const installedMas = masResult.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

    for (const [name, id] of Object.entries(config.mas)) {
      if (!installedMas.includes(id)) {
        log(`  Installing: ${colors.blue}${name}${colors.reset}`);
        await runCommand(["mas", "install", String(id)], cb, undefined, true);
      }
    }
  }

  if (config.config.purge) {
    await purgeUnlisted(config, config.config.purgeInteractive, cb);
  }

  log(`\n${colors.cyan}=== Updating lockfile ===${colors.reset}\n`);
  const lock = await updateLockfile();
  const lockTotal = Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
  log(`  Locked ${lockTotal} packages`);

  log(`\n${colors.green}=== Sync complete ===${colors.reset}\n`);
}

async function purgeUnlisted(
  config: PkgConfig,
  interactive: boolean,
  cb: PkgSyncCallbacks | null = null
): Promise<void> {
  const log = cb?.onLog ?? console.log;
  const askPrompt = cb?.onPrompt ?? (async (q: string) => (prompt(q) || "").trim().toLowerCase());

  log(`\n${colors.cyan}=== Checking for unlisted packages ===${colors.reset}\n`);

  const installedFormulas = (await exec(["brew", "list", "--formula"])).stdout
    .split("\n")
    .filter(Boolean);

  for (const pkg of installedFormulas) {
    if (!config.packages.includes(pkg)) {
      const usesResult = await exec(["brew", "uses", "--installed", pkg]);
      if (usesResult.stdout.trim()) {
        log(`  ${colors.yellow}Skipping ${pkg} (has dependents)${colors.reset}`);
        continue;
      }

      if (interactive) {
        const answer = await askPrompt(`Remove ${colors.red}${pkg}${colors.reset}?`, ["y", "n"]);
        if (answer === "y") {
          await runCommand(["brew", "uninstall", pkg], cb);
        }
      } else {
        log(`  Removing: ${colors.red}${pkg}${colors.reset}`);
        await runCommand(["brew", "uninstall", pkg], cb);
      }
    }
  }

  const installedCasks = (await exec(["brew", "list", "--cask"])).stdout
    .split("\n")
    .filter(Boolean);

  for (const cask of installedCasks) {
    if (!config.casks.includes(cask)) {
      if (interactive) {
        const answer = await askPrompt(`Remove cask ${colors.red}${cask}${colors.reset}?`, ["y", "n"]);
        if (answer === "y") {
          await runCommand(["brew", "uninstall", "--cask", cask], cb);
        }
      } else {
        log(`  Removing cask: ${colors.red}${cask}${colors.reset}`);
        await runCommand(["brew", "uninstall", "--cask", cask], cb);
      }
    }
  }

  if (await commandExists("mas")) {
    const masResult = await exec(["mas", "list"]);
    const installedMas = masResult.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(|$)/);
        return match
          ? { id: parseInt(match[1], 10), name: match[2].trim() }
          : null;
      })
      .filter((app): app is MasApp => app !== null);

    const configMasIds = Object.values(config.mas);

    for (const app of installedMas) {
      if (SYSTEM_APP_IDS.includes(app.id)) {
        continue;
      }

      if (!configMasIds.includes(app.id)) {
        if (interactive) {
          const answer = await askPrompt(`Remove app ${colors.red}${app.name}${colors.reset}?`, ["y", "n"]);
          if (answer === "y") {
            await runCommand(["mas", "uninstall", String(app.id)], cb, undefined, true);
          }
        } else {
          log(`  Removing app: ${colors.red}${app.name}${colors.reset}`);
          await runCommand(["mas", "uninstall", String(app.id)], cb, undefined, true);
        }
      }
    }
  }

  log(`\n${colors.cyan}=== Cleaning up ===${colors.reset}\n`);
  await runCommand(["brew", "autoremove"], cb);
  await runCommand(["brew", "cleanup"], cb);
}

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

  try {
    if (!(await commandExists("brew"))) {
      callbacks.onLog(`${colors.red}Error: Homebrew not installed${colors.reset}`);
      return { output: "Homebrew not installed", success: false };
    }
  } catch {
    return { output: "Homebrew not installed", success: false };
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

  try {
    await checkDependencies();
  } catch {
    return { output: "Homebrew not installed", success: false };
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

async function main() {
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

  await checkDependencies();

  if (values["upgrade-interactive"]) {
    await upgradeInteractive();
    return;
  }

  if (values["upgrade-only"]) {
    const result = await upgradeWithVerification();

    // Print summary
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
