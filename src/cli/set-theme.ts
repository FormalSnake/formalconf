import { parseArgs } from "util";
import { readdirSync, existsSync, rmSync, symlinkSync, unlinkSync } from "fs";
import { join } from "path";
import {
  THEMES_DIR,
  THEME_TARGET_DIR,
  BACKGROUNDS_TARGET_DIR,
  ensureConfigDir,
  ensureDir,
} from "../lib/paths";

import { parseTheme } from "../lib/theme-parser";
import { runHooks } from "../lib/hooks";
import {
  getDeviceHostname,
  getDeviceTheme,
  setDeviceTheme,
  setDefaultTheme,
  clearDeviceTheme,
  listDeviceMappings,
  getDefaultTheme,
} from "../lib/theme-config";
import type { Theme } from "../types/theme";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

async function listThemes(): Promise<Theme[]> {
  await ensureConfigDir();

  if (!existsSync(THEMES_DIR)) {
    return [];
  }

  const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: Theme[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const themePath = join(THEMES_DIR, entry.name);
      const theme = await parseTheme(themePath, entry.name);
      themes.push(theme);
    }
  }

  return themes;
}

function clearDirectory(dir: string): void {
  if (existsSync(dir)) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isSymbolicLink() || entry.isFile()) {
        unlinkSync(fullPath);
      } else if (entry.isDirectory()) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
}

function createSymlink(source: string, target: string): void {
  if (existsSync(target)) {
    unlinkSync(target);
  }
  symlinkSync(source, target);
}

async function applyTheme(
  themeName: string,
  saveMapping: boolean = false
): Promise<{ output: string; success: boolean }> {
  const themeDir = join(THEMES_DIR, themeName);

  if (!existsSync(themeDir)) {
    return { output: `Theme '${themeName}' not found`, success: false };
  }

  await ensureConfigDir();
  await ensureDir(THEME_TARGET_DIR);

  const theme = await parseTheme(themeDir, themeName);

  // Clear existing symlinks
  clearDirectory(THEME_TARGET_DIR);
  if (existsSync(BACKGROUNDS_TARGET_DIR)) {
    rmSync(BACKGROUNDS_TARGET_DIR, { recursive: true, force: true });
  }

  // Symlink all theme files (excluding directories, theme.yaml, and light.mode)
  const entries = readdirSync(themeDir, { withFileTypes: true });

  for (const entry of entries) {
    const source = join(themeDir, entry.name);

    if (
      entry.isFile() &&
      entry.name !== "theme.yaml" &&
      entry.name !== "light.mode"
    ) {
      const target = join(THEME_TARGET_DIR, entry.name);
      createSymlink(source, target);
    }
  }

  // Symlink backgrounds directory if present
  if (theme.hasBackgrounds) {
    const backgroundsSource = join(themeDir, "backgrounds");
    createSymlink(backgroundsSource, BACKGROUNDS_TARGET_DIR);
  }

  // Save device mapping if requested
  if (saveMapping) {
    await setDeviceTheme(themeName);
  }

  let output = `Theme '${theme.name}' applied successfully`;
  if (saveMapping) {
    output += ` (saved as device preference for '${getDeviceHostname()}')`;
  }
  if (theme.metadata?.author) {
    output += `\nAuthor: ${theme.metadata.author}`;
  }
  if (theme.hasBackgrounds) {
    output += `\nWallpapers available at: ~/.config/formalconf/current/backgrounds/`;
  }
  if (theme.isLightMode) {
    output += `\nNote: This is a light mode theme`;
  }

  // Run theme-change hooks
  const hookSummary = await runHooks("theme-change", {
    FORMALCONF_THEME: themeName,
    FORMALCONF_THEME_DIR: themeDir,
  });

  if (hookSummary.executed > 0) {
    output += `\nHooks: ${hookSummary.succeeded}/${hookSummary.executed} succeeded`;
    for (const result of hookSummary.results) {
      if (!result.success) {
        output += `\n  ⚠ ${result.script} failed (exit ${result.exitCode})`;
      }
    }
  }

  return { output, success: true };
}

async function showThemeInfo(themeName: string): Promise<void> {
  const themeDir = join(THEMES_DIR, themeName);

  if (!existsSync(themeDir)) {
    console.error(
      `${colors.red}Error: Theme '${themeName}' not found${colors.reset}`
    );
    process.exit(1);
  }

  const theme = await parseTheme(themeDir, themeName);

  console.log(`\n${colors.cyan}Theme: ${theme.name}${colors.reset}`);

  if (theme.metadata) {
    if (theme.metadata.author)
      console.log(`Author: ${theme.metadata.author}`);
    if (theme.metadata.description)
      console.log(`Description: ${theme.metadata.description}`);
    if (theme.metadata.version)
      console.log(`Version: ${theme.metadata.version}`);
    if (theme.metadata.source) console.log(`Source: ${theme.metadata.source}`);
  }

  console.log(`\nFiles (${theme.files.length}):`);
  for (const file of theme.files) {
    console.log(`  ${colors.blue}•${colors.reset} ${file.name}`);
  }

  if (theme.hasBackgrounds) {
    console.log(`\n${colors.green}Has wallpapers${colors.reset}`);
  }
  if (theme.hasPreview) {
    console.log(`${colors.green}Has preview image${colors.reset}`);
  }
  if (theme.isLightMode) {
    console.log(`${colors.yellow}Light mode theme${colors.reset}`);
  }
}

export interface SetThemeResult {
  output: string;
  success: boolean;
}

export async function runSetTheme(
  themeName: string,
  saveMapping: boolean = false
): Promise<SetThemeResult> {
  return applyTheme(themeName, saveMapping);
}

export { listThemes };

function showDeviceMappings(): void {
  const mappings = listDeviceMappings();
  const defaultTheme = getDefaultTheme();
  const currentDevice = getDeviceHostname();

  console.log(`${colors.cyan}Device Theme Mappings${colors.reset}`);
  console.log(`Current device: ${colors.blue}${currentDevice}${colors.reset}\n`);

  if (defaultTheme) {
    console.log(`Default theme: ${colors.green}${defaultTheme}${colors.reset}\n`);
  }

  if (mappings.length === 0) {
    console.log(`${colors.dim}No device-specific themes configured.${colors.reset}`);
    return;
  }

  console.log("Configured devices:");
  for (const mapping of mappings) {
    const marker = mapping.isCurrent ? ` ${colors.green}(current)${colors.reset}` : "";
    const date = new Date(mapping.setAt).toLocaleDateString();
    console.log(
      `  ${colors.blue}•${colors.reset} ${mapping.device}${marker}: ${mapping.theme} ${colors.dim}(set ${date})${colors.reset}`
    );
  }
}

async function showThemeList(): Promise<void> {
  const themes = await listThemes();
  const deviceTheme = getDeviceTheme();

  if (themes.length === 0) {
    console.log(`${colors.yellow}No themes available.${colors.reset}`);
    console.log(`This system is compatible with omarchy themes.`);
    console.log(
      `\nAdd themes to: ${colors.cyan}~/.config/formalconf/themes/${colors.reset}`
    );
    return;
  }

  console.log(`${colors.cyan}Usage: formalconf theme <theme-name>${colors.reset}`);
  console.log(`       formalconf theme <theme-name> --save  ${colors.dim}(save as device preference)${colors.reset}`);
  console.log(`       formalconf theme --apply              ${colors.dim}(apply device's theme)${colors.reset}`);
  console.log(`       formalconf theme --list-devices       ${colors.dim}(show device mappings)${colors.reset}`);
  console.log(`       formalconf theme --default <name>     ${colors.dim}(set default theme)${colors.reset}`);
  console.log(`       formalconf theme --clear-default      ${colors.dim}(remove default theme)${colors.reset}`);
  console.log(`       formalconf theme --clear              ${colors.dim}(remove device mapping)${colors.reset}`);
  console.log(`       formalconf theme --info <theme-name>  ${colors.dim}(show theme details)${colors.reset}\n`);

  console.log("Available themes:");
  for (const theme of themes) {
    const extras = [];
    if (theme.hasBackgrounds) extras.push("wallpapers");
    if (theme.isLightMode) extras.push("light");
    if (theme.name === deviceTheme) extras.push("device");
    const suffix = extras.length
      ? ` ${colors.dim}(${extras.join(", ")})${colors.reset}`
      : "";
    console.log(`  ${colors.blue}•${colors.reset} ${theme.name}${suffix}`);
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      info: { type: "boolean", short: "i" },
      save: { type: "boolean", short: "s" },
      apply: { type: "boolean", short: "a" },
      "list-devices": { type: "boolean", short: "l" },
      default: { type: "string", short: "d" },
      "clear-default": { type: "boolean" },
      clear: { type: "boolean", short: "c" },
    },
    allowPositionals: true,
  });

  const [themeName] = positionals;

  // Handle --list-devices
  if (values["list-devices"]) {
    showDeviceMappings();
    return;
  }

  // Handle --clear
  if (values.clear) {
    const deviceTheme = getDeviceTheme();
    if (!deviceTheme) {
      console.log(`${colors.yellow}No theme configured for this device.${colors.reset}`);
      return;
    }
    await clearDeviceTheme();
    console.log(
      `${colors.green}Removed theme mapping for '${getDeviceHostname()}'.${colors.reset}`
    );
    return;
  }

  // Handle --clear-default
  if (values["clear-default"]) {
    await setDefaultTheme(null);
    console.log(`${colors.green}Default theme cleared.${colors.reset}`);
    return;
  }

  // Handle --default
  if (values.default !== undefined) {
    const themeDir = join(THEMES_DIR, values.default);
    if (!existsSync(themeDir)) {
      console.error(
        `${colors.red}Error: Theme '${values.default}' not found${colors.reset}`
      );
      process.exit(1);
    }
    await setDefaultTheme(values.default);
    console.log(
      `${colors.green}Default theme set to '${values.default}'.${colors.reset}`
    );
    return;
  }

  // Handle --apply (apply device's configured theme)
  if (values.apply) {
    const deviceTheme = getDeviceTheme();
    if (!deviceTheme) {
      console.log(
        `${colors.yellow}No theme configured for device '${getDeviceHostname()}'.${colors.reset}`
      );
      console.log(`Use 'formalconf theme <name> --save' to set a device preference.`);
      return;
    }
    const result = await applyTheme(deviceTheme);
    console.log(
      result.success
        ? `${colors.green}${result.output}${colors.reset}`
        : `${colors.red}${result.output}${colors.reset}`
    );
    return;
  }

  // No theme name provided - try to apply device theme or show list
  if (!themeName) {
    const deviceTheme = getDeviceTheme();
    if (deviceTheme) {
      // Auto-apply device theme
      const result = await applyTheme(deviceTheme);
      console.log(
        result.success
          ? `${colors.green}${result.output}${colors.reset}`
          : `${colors.red}${result.output}${colors.reset}`
      );
    } else {
      // Show theme list
      await showThemeList();
    }
    return;
  }

  // Handle --info
  if (values.info) {
    await showThemeInfo(themeName);
    return;
  }

  // Apply theme (with optional --save)
  const result = await applyTheme(themeName, values.save ?? false);
  console.log(
    result.success
      ? `${colors.green}${result.output}${colors.reset}`
      : `${colors.red}${result.output}${colors.reset}`
  );
}

// Only run main when executed directly
const isMainModule = process.argv[1]?.includes("set-theme");
if (isMainModule) {
  main().catch(console.error);
}
