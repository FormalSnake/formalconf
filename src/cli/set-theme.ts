import { parseArgs } from "util";
import {
  readdirSync,
  existsSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  copyFileSync,
} from "fs";
import { join, basename } from "path";
import {
  THEMES_DIR,
  THEME_TARGET_DIR,
  BACKGROUNDS_TARGET_DIR,
  GENERATED_DIR,
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
import type { ThemeMode, ThemeJson, ThemeVariant } from "../types/theme-schema";
import {
  listJsonThemes,
  loadThemeJson,
  createThemeVariant,
  getAvailableModes,
} from "../lib/theme-v2/loader";
import { generateThemeConfigs } from "../lib/template-engine/engine";
import {
  listInstalledTemplates,
  installAllTemplates,
  checkTemplateUpdates,
} from "../lib/template-engine/versioning";
import {
  extractFromLegacyTheme,
  validatePalette,
  generateThemeJson,
} from "../lib/migration/extractor";
import { writeFile } from "../lib/runtime";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

/** Unified theme entry for CLI display */
export interface UnifiedThemeEntry {
  /** Display name (includes mode for JSON themes, e.g., "catppuccin (dark)") */
  displayName: string;
  /** Identifier used when applying (same as displayName for consistency) */
  identifier: string;
  /** Theme type */
  type: "legacy" | "json";
  /** Mode for JSON themes */
  mode?: ThemeMode;
  /** Path to theme (directory for legacy, JSON file for json) */
  path: string;
  /** Author */
  author?: string;
  /** Has wallpapers (legacy only) */
  hasBackgrounds?: boolean;
  /** Is light mode (legacy only) */
  isLightMode?: boolean;
}

/**
 * Lists all available themes (both JSON and legacy directory themes)
 */
async function listAllThemes(): Promise<UnifiedThemeEntry[]> {
  await ensureConfigDir();
  const themes: UnifiedThemeEntry[] = [];

  // First, add JSON themes
  const jsonThemes = await listJsonThemes();
  for (const item of jsonThemes) {
    for (const mode of item.availableModes) {
      themes.push({
        displayName: `${item.theme.title} (${mode})`,
        identifier: `${item.name}:${mode}`,
        type: "json",
        mode,
        path: item.path,
        author: item.theme.author,
      });
    }
  }

  // Then add legacy directory themes
  if (existsSync(THEMES_DIR)) {
    const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const themePath = join(THEMES_DIR, entry.name);
        const theme = await parseTheme(themePath, entry.name);
        themes.push({
          displayName: theme.name,
          identifier: theme.name,
          type: "legacy",
          path: themePath,
          author: theme.metadata?.author,
          hasBackgrounds: theme.hasBackgrounds,
          isLightMode: theme.isLightMode,
        });
      }
    }
  }

  return themes;
}

/**
 * Lists only legacy directory themes (for backwards compatibility)
 */
async function listLegacyThemes(): Promise<Theme[]> {
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

/**
 * Parses a theme identifier to extract name and mode
 * Format: "name:mode" for JSON themes, or just "name" for legacy
 */
function parseThemeIdentifier(identifier: string): {
  name: string;
  mode?: ThemeMode;
} {
  if (identifier.includes(":")) {
    const [name, mode] = identifier.split(":");
    if (mode === "dark" || mode === "light") {
      return { name, mode };
    }
  }
  return { name: identifier };
}

/**
 * Applies a JSON theme by rendering templates
 */
async function applyJsonTheme(
  themePath: string,
  mode: ThemeMode,
  saveMapping: boolean,
  identifier: string
): Promise<{ output: string; success: boolean }> {
  const theme = await loadThemeJson(themePath);

  await ensureConfigDir();
  await ensureDir(THEME_TARGET_DIR);
  await ensureDir(GENERATED_DIR);

  // Install templates if not already installed
  const installedTemplates = await listInstalledTemplates();
  if (installedTemplates.length === 0) {
    await installAllTemplates();
  }

  // Clear existing theme files
  clearDirectory(THEME_TARGET_DIR);
  if (existsSync(BACKGROUNDS_TARGET_DIR)) {
    rmSync(BACKGROUNDS_TARGET_DIR, { recursive: true, force: true });
  }

  // Generate and write theme configs
  const results = await generateThemeConfigs(theme, mode);

  // Copy generated files to theme target directory
  for (const result of results) {
    const targetPath = join(THEME_TARGET_DIR, basename(result.outputPath));
    copyFileSync(result.outputPath, targetPath);
  }

  // Save device mapping if requested
  if (saveMapping) {
    await setDeviceTheme(identifier);
  }

  let output = `Theme '${theme.title} (${mode})' applied successfully`;
  output += `\nGenerated ${results.length} config files`;

  if (saveMapping) {
    output += `\nSaved as device preference for '${getDeviceHostname()}'`;
  }
  if (theme.author) {
    output += `\nAuthor: ${theme.author}`;
  }

  // Run theme-change hooks
  const hookSummary = await runHooks("theme-change", {
    FORMALCONF_THEME: identifier,
    FORMALCONF_THEME_MODE: mode,
    FORMALCONF_THEME_FILE: themePath,
  });

  if (hookSummary.executed > 0) {
    output += `\nHooks: ${hookSummary.succeeded}/${hookSummary.executed} succeeded`;
    for (const result of hookSummary.results) {
      if (!result.success) {
        output += `\n  Warning: ${result.script} failed (exit ${result.exitCode})`;
      }
    }
  }

  return { output, success: true };
}

/**
 * Applies a legacy directory theme by symlinking
 */
async function applyLegacyTheme(
  themeName: string,
  saveMapping: boolean
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
        output += `\n  Warning: ${result.script} failed (exit ${result.exitCode})`;
      }
    }
  }

  return { output, success: true };
}

/**
 * Applies a theme (auto-detects JSON vs legacy)
 */
async function applyTheme(
  themeIdentifier: string,
  saveMapping: boolean = false
): Promise<{ output: string; success: boolean }> {
  const { name, mode } = parseThemeIdentifier(themeIdentifier);

  // Check if it's a JSON theme
  const jsonPath = join(THEMES_DIR, `${name}.json`);
  if (existsSync(jsonPath) && mode) {
    return applyJsonTheme(jsonPath, mode, saveMapping, themeIdentifier);
  }

  // Check legacy directory
  const legacyPath = join(THEMES_DIR, name);
  if (existsSync(legacyPath)) {
    return applyLegacyTheme(name, saveMapping);
  }

  // Theme not found - try to help user
  const allThemes = await listAllThemes();
  const suggestions = allThemes
    .filter((t) => t.displayName.toLowerCase().includes(name.toLowerCase()))
    .slice(0, 3);

  let output = `Theme '${themeIdentifier}' not found`;
  if (suggestions.length > 0) {
    output += `\n\nDid you mean:`;
    for (const s of suggestions) {
      output += `\n  - ${s.identifier}`;
    }
  }

  return { output, success: false };
}

async function showThemeInfo(themeIdentifier: string): Promise<void> {
  const { name, mode } = parseThemeIdentifier(themeIdentifier);

  // Check JSON theme
  const jsonPath = join(THEMES_DIR, `${name}.json`);
  if (existsSync(jsonPath)) {
    const theme = await loadThemeJson(jsonPath);
    const modes = getAvailableModes(theme);

    console.log(`\n${colors.cyan}Theme: ${theme.title}${colors.reset}`);
    console.log(`Type: JSON template-based theme`);
    if (theme.author) console.log(`Author: ${theme.author}`);
    if (theme.description) console.log(`Description: ${theme.description}`);
    if (theme.version) console.log(`Version: ${theme.version}`);
    if (theme.source) console.log(`Source: ${theme.source}`);
    console.log(`Available modes: ${modes.join(", ")}`);

    if (theme.neovim) {
      console.log(`\n${colors.green}Neovim integration:${colors.reset}`);
      console.log(`  Plugin: ${theme.neovim.repo}`);
      console.log(`  Colorscheme: ${theme.neovim.colorscheme}`);
      if (theme.neovim.light_colorscheme) {
        console.log(`  Light colorscheme: ${theme.neovim.light_colorscheme}`);
      }
    }
    return;
  }

  // Check legacy theme
  const themeDir = join(THEMES_DIR, name);
  if (!existsSync(themeDir)) {
    console.error(
      `${colors.red}Error: Theme '${themeIdentifier}' not found${colors.reset}`
    );
    process.exit(1);
  }

  const theme = await parseTheme(themeDir, name);

  console.log(`\n${colors.cyan}Theme: ${theme.name}${colors.reset}`);
  console.log(`Type: Legacy directory-based theme`);

  if (theme.metadata) {
    if (theme.metadata.author) console.log(`Author: ${theme.metadata.author}`);
    if (theme.metadata.description)
      console.log(`Description: ${theme.metadata.description}`);
    if (theme.metadata.version) console.log(`Version: ${theme.metadata.version}`);
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

// Export both legacy and unified list functions
export { listLegacyThemes as listThemes, listAllThemes };

function showDeviceMappings(): void {
  const mappings = listDeviceMappings();
  const defaultTheme = getDefaultTheme();
  const currentDevice = getDeviceHostname();

  console.log(`${colors.cyan}Device Theme Mappings${colors.reset}`);
  console.log(
    `Current device: ${colors.blue}${currentDevice}${colors.reset}\n`
  );

  if (defaultTheme) {
    console.log(
      `Default theme: ${colors.green}${defaultTheme}${colors.reset}\n`
    );
  }

  if (mappings.length === 0) {
    console.log(
      `${colors.dim}No device-specific themes configured.${colors.reset}`
    );
    return;
  }

  console.log("Configured devices:");
  for (const mapping of mappings) {
    const marker = mapping.isCurrent
      ? ` ${colors.green}(current)${colors.reset}`
      : "";
    const date = new Date(mapping.setAt).toLocaleDateString();
    console.log(
      `  ${colors.blue}•${colors.reset} ${mapping.device}${marker}: ${mapping.theme} ${colors.dim}(set ${date})${colors.reset}`
    );
  }
}

async function showThemeList(): Promise<void> {
  const themes = await listAllThemes();
  const deviceTheme = getDeviceTheme();

  if (themes.length === 0) {
    console.log(`${colors.yellow}No themes available.${colors.reset}`);
    console.log(`\nTo add themes:`);
    console.log(
      `  - JSON themes: ${colors.cyan}~/.config/formalconf/themes/*.json${colors.reset}`
    );
    console.log(
      `  - Legacy themes: ${colors.cyan}~/.config/formalconf/themes/<name>/${colors.reset}`
    );
    return;
  }

  console.log(`${colors.cyan}Usage: formalconf theme <theme-id>${colors.reset}`);
  console.log(
    `       formalconf theme <theme-id> --save  ${colors.dim}(save as device preference)${colors.reset}`
  );
  console.log(
    `       formalconf theme --apply              ${colors.dim}(apply device's theme)${colors.reset}`
  );
  console.log(
    `       formalconf theme --list-devices       ${colors.dim}(show device mappings)${colors.reset}`
  );
  console.log(
    `       formalconf theme --default <id>       ${colors.dim}(set default theme)${colors.reset}`
  );
  console.log(
    `       formalconf theme --clear-default      ${colors.dim}(remove default theme)${colors.reset}`
  );
  console.log(
    `       formalconf theme --clear              ${colors.dim}(remove device mapping)${colors.reset}`
  );
  console.log(
    `       formalconf theme --info <theme-id>    ${colors.dim}(show theme details)${colors.reset}\n`
  );

  // Group themes by type
  const jsonThemes = themes.filter((t) => t.type === "json");
  const legacyThemes = themes.filter((t) => t.type === "legacy");

  if (jsonThemes.length > 0) {
    console.log(`${colors.cyan}Template-based themes:${colors.reset}`);
    for (const theme of jsonThemes) {
      const extras = [];
      if (theme.identifier === deviceTheme) extras.push("device");
      const suffix = extras.length
        ? ` ${colors.dim}(${extras.join(", ")})${colors.reset}`
        : "";
      console.log(
        `  ${colors.blue}•${colors.reset} ${theme.displayName} ${colors.dim}[${theme.identifier}]${colors.reset}${suffix}`
      );
    }
  }

  if (legacyThemes.length > 0) {
    if (jsonThemes.length > 0) console.log("");
    console.log(`${colors.cyan}Legacy themes:${colors.reset}`);
    for (const theme of legacyThemes) {
      const extras = [];
      if (theme.hasBackgrounds) extras.push("wallpapers");
      if (theme.isLightMode) extras.push("light");
      if (theme.identifier === deviceTheme) extras.push("device");
      const suffix = extras.length
        ? ` ${colors.dim}(${extras.join(", ")})${colors.reset}`
        : "";
      console.log(
        `  ${colors.blue}•${colors.reset} ${theme.displayName}${suffix}`
      );
    }
  }
}

async function migrateTheme(themeName: string): Promise<void> {
  const legacyPath = join(THEMES_DIR, themeName);

  if (!existsSync(legacyPath)) {
    console.error(
      `${colors.red}Error: Legacy theme '${themeName}' not found${colors.reset}`
    );
    process.exit(1);
  }

  console.log(`Extracting colors from '${themeName}'...`);

  const result = await extractFromLegacyTheme(legacyPath);

  if (!result) {
    console.error(
      `${colors.red}Error: Could not extract colors from theme${colors.reset}`
    );
    console.error(`No supported config files found (kitty.conf, alacritty.toml, ghostty.conf)`);
    process.exit(1);
  }

  console.log(`Found colors in: ${result.source}`);

  const missing = validatePalette(result.colors);
  if (missing.length > 0) {
    console.log(
      `${colors.yellow}Warning: Missing colors will be filled with defaults:${colors.reset}`
    );
    console.log(`  ${missing.join(", ")}`);
  }

  // Check if it's a light theme
  const isLight = existsSync(join(legacyPath, "light.mode"));

  const themeJson = generateThemeJson(themeName, result.colors, {
    description: `Migrated from legacy theme`,
    isLight,
  });

  const outputPath = join(THEMES_DIR, `${themeName}.json`);

  if (existsSync(outputPath)) {
    console.error(
      `${colors.red}Error: JSON theme '${themeName}.json' already exists${colors.reset}`
    );
    console.error(`Delete or rename it first, then try again.`);
    process.exit(1);
  }

  await writeFile(outputPath, JSON.stringify(themeJson, null, 2));

  console.log(
    `${colors.green}Theme migrated successfully to '${themeName}.json'${colors.reset}`
  );
  console.log(`\nNext steps:`);
  console.log(`  1. Review and edit ${outputPath}`);
  console.log(`  2. Add a light palette if needed`);
  console.log(`  3. Add neovim configuration if desired`);
  console.log(`  4. Test with: bun run theme ${themeName}:${isLight ? "light" : "dark"}`);
}

async function showTemplateStatus(): Promise<void> {
  const installed = await listInstalledTemplates();
  const updates = await checkTemplateUpdates();

  console.log(`${colors.cyan}Template Status${colors.reset}\n`);

  if (installed.length === 0) {
    console.log(`${colors.yellow}No templates installed.${colors.reset}`);
    console.log(`Run 'formalconf theme --install-templates' to install bundled templates.`);
    return;
  }

  console.log(`Installed templates (${installed.length}):`);
  for (const template of installed) {
    console.log(`  ${colors.blue}•${colors.reset} ${template.name}`);
  }

  if (updates.length > 0) {
    console.log(`\n${colors.yellow}Updates available:${colors.reset}`);
    for (const update of updates) {
      if (update.updateAvailable) {
        const locked = update.customOverride
          ? ` ${colors.dim}(locked)${colors.reset}`
          : "";
        console.log(
          `  ${colors.blue}•${colors.reset} ${update.name}: ${update.installedVersion} -> ${update.bundledVersion}${locked}`
        );
      }
    }
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
      "install-templates": { type: "boolean" },
      "template-status": { type: "boolean" },
      migrate: { type: "string", short: "m" },
    },
    allowPositionals: true,
  });

  const [themeName] = positionals;

  // Handle --template-status
  if (values["template-status"]) {
    await showTemplateStatus();
    return;
  }

  // Handle --install-templates
  if (values["install-templates"]) {
    await installAllTemplates();
    console.log(`${colors.green}Templates installed successfully.${colors.reset}`);
    return;
  }

  // Handle --migrate
  if (values.migrate) {
    await migrateTheme(values.migrate);
    return;
  }

  // Handle --list-devices
  if (values["list-devices"]) {
    showDeviceMappings();
    return;
  }

  // Handle --clear
  if (values.clear) {
    const deviceTheme = getDeviceTheme();
    if (!deviceTheme) {
      console.log(
        `${colors.yellow}No theme configured for this device.${colors.reset}`
      );
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
    // Validate theme exists
    const allThemes = await listAllThemes();
    const exists = allThemes.some((t) => t.identifier === values.default);
    if (!exists) {
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
      console.log(
        `Use 'formalconf theme <name> --save' to set a device preference.`
      );
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
