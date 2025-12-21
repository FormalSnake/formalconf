import { parseArgs } from "util";
import { readdirSync, existsSync, lstatSync, readlinkSync } from "fs";
import { exec, commandExists } from "../lib/shell";
import { CONFIGS_DIR, HOME_DIR } from "../lib/paths";
import type { StowPackage, StowResult } from "../types/stow";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  reset: "\x1b[0m",
};

async function checkStow(): Promise<void> {
  if (!(await commandExists("stow"))) {
    console.error(
      `${colors.red}Error: GNU Stow is not installed. Install with: brew install stow${colors.reset}`
    );
    process.exit(1);
  }
}

function listPackages(): StowPackage[] {
  const entries = readdirSync(CONFIGS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      path: `${CONFIGS_DIR}/${e.name}`,
      isStowed: checkPackageStowed(e.name),
    }));
}

function checkPackageStowed(packageName: string): boolean {
  const packageDir = `${CONFIGS_DIR}/${packageName}`;
  if (!existsSync(packageDir)) return false;

  const entries = readdirSync(packageDir, { withFileTypes: true });
  for (const entry of entries) {
    const targetPath = `${HOME_DIR}/${entry.name}`;
    if (!existsSync(targetPath)) return false;

    try {
      const stat = lstatSync(targetPath);
      if (!stat.isSymbolicLink()) continue;

      const linkTarget = readlinkSync(targetPath);
      if (!linkTarget.includes(packageDir)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function stowPackage(packageName: string): Promise<StowResult> {
  const result = await exec(
    ["stow", "-v", "--target", HOME_DIR, packageName],
    CONFIGS_DIR
  );

  return {
    success: result.success,
    package: packageName,
    message: result.success
      ? `${packageName} stowed successfully`
      : result.stderr,
  };
}

async function unstowPackage(packageName: string): Promise<StowResult> {
  const result = await exec(
    ["stow", "-v", "--delete", "--target", HOME_DIR, packageName],
    CONFIGS_DIR
  );

  return {
    success: result.success,
    package: packageName,
    message: result.success
      ? `${packageName} unstowed successfully`
      : result.stderr,
  };
}

async function restowPackage(packageName: string): Promise<StowResult> {
  const result = await exec(
    ["stow", "-v", "--restow", "--target", HOME_DIR, packageName],
    CONFIGS_DIR
  );

  return {
    success: result.success,
    package: packageName,
    message: result.success
      ? `${packageName} restowed successfully`
      : result.stderr,
  };
}

async function adoptPackage(packageName: string): Promise<StowResult> {
  const result = await exec(
    ["stow", "-v", "--adopt", "--target", HOME_DIR, packageName],
    CONFIGS_DIR
  );

  return {
    success: result.success,
    package: packageName,
    message: result.success
      ? `${packageName} adopted successfully`
      : result.stderr,
  };
}

async function showStatus(): Promise<void> {
  const packages = listPackages();
  console.log(`\n${colors.cyan}Package Status:${colors.reset}`);
  console.log("─".repeat(40));

  for (const pkg of packages) {
    const status = pkg.isStowed
      ? `${colors.green}✓ stowed${colors.reset}`
      : `${colors.yellow}○ not stowed${colors.reset}`;
    console.log(`  ${pkg.name}: ${status}`);
  }
  console.log();
}

async function stowAll(): Promise<void> {
  const packages = listPackages();
  console.log(`\n${colors.cyan}Stowing all packages...${colors.reset}\n`);

  for (const pkg of packages) {
    const result = await stowPackage(pkg.name);
    const icon = result.success ? colors.green + "✓" : colors.red + "✗";
    console.log(`  ${icon} ${result.message}${colors.reset}`);
  }
  console.log();
}

async function unstowAll(): Promise<void> {
  const packages = listPackages();
  console.log(`\n${colors.cyan}Unstowing all packages...${colors.reset}\n`);

  for (const pkg of packages) {
    const result = await unstowPackage(pkg.name);
    const icon = result.success ? colors.green + "✓" : colors.red + "✗";
    console.log(`  ${icon} ${result.message}${colors.reset}`);
  }
  console.log();
}

function printUsage(): void {
  console.log(`
${colors.cyan}Usage: bun run config <command> [package]${colors.reset}

Commands:
  ${colors.blue}stow${colors.reset} <package>     Stow a package
  ${colors.blue}unstow${colors.reset} <package>   Unstow a package
  ${colors.blue}restow${colors.reset} <package>   Restow a package
  ${colors.blue}adopt${colors.reset} <package>    Adopt existing config into package
  ${colors.blue}list${colors.reset}               List all packages
  ${colors.blue}status${colors.reset}             Show status of all packages
  ${colors.blue}stow-all${colors.reset}           Stow all packages
  ${colors.blue}unstow-all${colors.reset}         Unstow all packages
`);
}

async function main() {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
  });

  await checkStow();

  const [command, packageName] = positionals;

  switch (command) {
    case "stow": {
      if (!packageName) {
        console.error(`${colors.red}Error: Package name required${colors.reset}`);
        process.exit(1);
      }
      const result = await stowPackage(packageName);
      console.log(
        result.success
          ? `${colors.green}${result.message}${colors.reset}`
          : `${colors.red}${result.message}${colors.reset}`
      );
      break;
    }
    case "unstow": {
      if (!packageName) {
        console.error(`${colors.red}Error: Package name required${colors.reset}`);
        process.exit(1);
      }
      const result = await unstowPackage(packageName);
      console.log(
        result.success
          ? `${colors.green}${result.message}${colors.reset}`
          : `${colors.red}${result.message}${colors.reset}`
      );
      break;
    }
    case "restow": {
      if (!packageName) {
        console.error(`${colors.red}Error: Package name required${colors.reset}`);
        process.exit(1);
      }
      const result = await restowPackage(packageName);
      console.log(
        result.success
          ? `${colors.green}${result.message}${colors.reset}`
          : `${colors.red}${result.message}${colors.reset}`
      );
      break;
    }
    case "adopt": {
      if (!packageName) {
        console.error(`${colors.red}Error: Package name required${colors.reset}`);
        process.exit(1);
      }
      const result = await adoptPackage(packageName);
      console.log(
        result.success
          ? `${colors.green}${result.message}${colors.reset}`
          : `${colors.red}${result.message}${colors.reset}`
      );
      break;
    }
    case "list": {
      const packages = listPackages();
      console.log(`\n${colors.cyan}Available packages:${colors.reset}`);
      for (const pkg of packages) {
        console.log(`  ${colors.blue}•${colors.reset} ${pkg.name}`);
      }
      console.log();
      break;
    }
    case "status":
      await showStatus();
      break;
    case "stow-all":
      await stowAll();
      break;
    case "unstow-all":
      await unstowAll();
      break;
    default:
      printUsage();
      break;
  }
}

main().catch(console.error);
