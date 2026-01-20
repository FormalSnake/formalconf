import { parseArgs } from "util";
import {
  checkTemplateUpdates,
  installTemplate,
  installAllTemplates,
  listInstalledTemplates,
  lockTemplate,
  unlockTemplate,
} from "../lib/template-engine/versioning";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

function printHelp(): void {
  console.log(`
${colors.cyan}Template Manager - Manage formalconf templates${colors.reset}

Usage:
  formalconf template <command> [options]

Commands:
  ${colors.blue}update${colors.reset} [name]    Update templates (all if no name specified)
  ${colors.blue}list${colors.reset}             List installed templates
  ${colors.blue}check${colors.reset}            Check for available updates
  ${colors.blue}lock${colors.reset} <name>      Lock a template from updates
  ${colors.blue}unlock${colors.reset} <name>    Unlock a template for updates

Options:
  -h, --help       Show this help message
  --all            Update all templates (with update command)

Examples:
  formalconf template update --all
  formalconf template check
  formalconf template lock neovim.lua.template
`);
}

export async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      all: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  const [subCommand, ...args] = positionals;

  if (values.help || !subCommand) {
    printHelp();
    process.exit(0);
  }

  switch (subCommand) {
    case "update":
      await handleUpdate(args[0], values.all as boolean);
      break;
    case "list":
      await handleList();
      break;
    case "check":
      await handleCheck();
      break;
    case "lock":
      if (!args[0]) {
        console.error(`${colors.red}Error: Template name required${colors.reset}`);
        process.exit(1);
      }
      await lockTemplate(args[0]);
      console.log(`${colors.green}Locked ${args[0]}${colors.reset}`);
      break;
    case "unlock":
      if (!args[0]) {
        console.error(`${colors.red}Error: Template name required${colors.reset}`);
        process.exit(1);
      }
      await unlockTemplate(args[0]);
      console.log(`${colors.green}Unlocked ${args[0]}${colors.reset}`);
      break;
    default:
      console.error(`${colors.red}Unknown command: ${subCommand}${colors.reset}`);
      printHelp();
      process.exit(1);
  }
}

async function handleUpdate(name?: string, all?: boolean): Promise<void> {
  if (all || !name) {
    console.log(`${colors.cyan}Updating all templates...${colors.reset}`);
    await installAllTemplates();
    console.log(`${colors.green}All templates updated${colors.reset}`);
  } else {
    console.log(`${colors.cyan}Updating ${name}...${colors.reset}`);
    await installTemplate(name);
    console.log(`${colors.green}Updated ${name}${colors.reset}`);
  }
}

async function handleList(): Promise<void> {
  const templates = await listInstalledTemplates();
  console.log(`\n${colors.cyan}Installed templates:${colors.reset}`);
  for (const t of templates) {
    const typeLabel = t.type === "dual" ? colors.blue + "dual" : t.type === "partial" ? colors.yellow + "partial" : colors.dim + "single";
    console.log(`  ${colors.blue}•${colors.reset} ${t.name} (${typeLabel}${colors.reset})`);
  }
  console.log();
}

async function handleCheck(): Promise<void> {
  const updates = await checkTemplateUpdates();
  const available = updates.filter((u) => u.updateAvailable);
  if (available.length === 0) {
    console.log(`${colors.green}All templates are up to date${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Updates available:${colors.reset}`);
    for (const u of available) {
      console.log(`  ${u.name}: ${u.installedVersion} -> ${u.bundledVersion}`);
    }
  }
}

// Only run main when executed directly
const isMainModule = process.argv[1]?.includes("template-manager");
if (isMainModule) {
  main().catch(console.error);
}
