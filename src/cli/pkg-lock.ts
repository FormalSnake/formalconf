import { parseArgs } from "util";
import {
  updateLockfile,
  generateLockfile,
  getChangedPackages,
} from "../lib/lockfile";
import { loadPkgLock, savePkgLock } from "../lib/config";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function printUsage(): void {
  console.log(`
${colors.cyan}Usage: bun run pkg-lock [command]${colors.reset}

Commands:
  ${colors.blue}update${colors.reset}    Update lockfile with current installed versions (default)
  ${colors.blue}status${colors.reset}    Show changes since last lock
  ${colors.blue}reset${colors.reset}     Regenerate lockfile from scratch
  ${colors.blue}show${colors.reset}      Display current lockfile contents
`);
}

async function showStatus(): Promise<void> {
  const lock = await loadPkgLock();

  if (!lock) {
    console.log(
      `${colors.yellow}No lockfile found. Run 'bun run pkg-lock' to create one.${colors.reset}`
    );
    return;
  }

  const changes = await getChangedPackages();

  if (
    changes.added.length === 0 &&
    changes.removed.length === 0 &&
    changes.upgraded.length === 0
  ) {
    console.log(`${colors.green}Lockfile is up to date.${colors.reset}`);
    console.log(`  Last updated: ${lock.lastUpdated}`);
    return;
  }

  console.log(`${colors.bold}Changes since last lock:${colors.reset}\n`);

  if (changes.added.length > 0) {
    console.log(`${colors.green}Added:${colors.reset}`);
    for (const name of changes.added) {
      console.log(`  + ${name}`);
    }
  }

  if (changes.removed.length > 0) {
    console.log(`${colors.red}Removed:${colors.reset}`);
    for (const name of changes.removed) {
      console.log(`  - ${name}`);
    }
  }

  if (changes.upgraded.length > 0) {
    console.log(`${colors.blue}Upgraded:${colors.reset}`);
    for (const { name, from, to } of changes.upgraded) {
      console.log(`  ~ ${name}: ${from} -> ${to}`);
    }
  }
}

async function showLockfile(): Promise<void> {
  const lock = await loadPkgLock();

  if (!lock) {
    console.log(`${colors.yellow}No lockfile found.${colors.reset}`);
    return;
  }

  console.log(`${colors.bold}Package Lockfile${colors.reset}`);
  console.log(`Last updated: ${lock.lastUpdated}\n`);

  const formulaNames = Object.keys(lock.formulas).sort();
  const caskNames = Object.keys(lock.casks).sort();

  if (formulaNames.length > 0) {
    console.log(`${colors.cyan}Formulas (${formulaNames.length}):${colors.reset}`);
    for (const name of formulaNames) {
      const { version, tap } = lock.formulas[name];
      console.log(`  ${name} ${colors.blue}${version}${colors.reset} (${tap})`);
    }
  }

  if (caskNames.length > 0) {
    console.log(`\n${colors.cyan}Casks (${caskNames.length}):${colors.reset}`);
    for (const name of caskNames) {
      const { version } = lock.casks[name];
      console.log(`  ${name} ${colors.blue}${version}${colors.reset}`);
    }
  }
}

export interface PkgLockResult {
  output: string;
  success: boolean;
}

export async function runPkgLock(args: string[]): Promise<PkgLockResult> {
  const { positionals } = parseArgs({
    args,
    options: {
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  const command = positionals[0] || "update";

  switch (command) {
    case "update": {
      const lock = await updateLockfile();
      const total =
        Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
      return { output: `Lockfile updated with ${total} packages`, success: true };
    }
    case "status": {
      const lock = await loadPkgLock();
      if (!lock) {
        return { output: "No lockfile found", success: false };
      }
      const changes = await getChangedPackages();
      if (changes.added.length === 0 && changes.removed.length === 0 && changes.upgraded.length === 0) {
        return { output: `Lockfile is up to date (last: ${lock.lastUpdated})`, success: true };
      }
      let output = "Changes:\n";
      if (changes.added.length > 0) output += `Added: ${changes.added.join(", ")}\n`;
      if (changes.removed.length > 0) output += `Removed: ${changes.removed.join(", ")}\n`;
      if (changes.upgraded.length > 0) output += `Upgraded: ${changes.upgraded.map(u => u.name).join(", ")}`;
      return { output, success: true };
    }
    default:
      return { output: `Unknown command: ${command}`, success: false };
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const command = positionals[0] || "update";

  switch (command) {
    case "update": {
      console.log(`${colors.cyan}Updating lockfile...${colors.reset}`);
      const lock = await updateLockfile();
      const total =
        Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
      console.log(
        `${colors.green}Lockfile updated with ${total} packages.${colors.reset}`
      );
      break;
    }
    case "status":
      await showStatus();
      break;
    case "reset": {
      console.log(`${colors.cyan}Regenerating lockfile...${colors.reset}`);
      const lock = await generateLockfile();
      await savePkgLock(lock);
      const total =
        Object.keys(lock.formulas).length + Object.keys(lock.casks).length;
      console.log(
        `${colors.green}Lockfile regenerated with ${total} packages.${colors.reset}`
      );
      break;
    }
    case "show":
      await showLockfile();
      break;
    default:
      console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      printUsage();
      process.exit(1);
  }
}

// Only run main when executed directly
const isMainModule = process.argv[1]?.includes("pkg-lock");
if (isMainModule) {
  main().catch(console.error);
}
