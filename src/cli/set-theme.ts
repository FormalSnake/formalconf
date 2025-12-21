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

async function applyTheme(themeName: string): Promise<{ output: string; success: boolean }> {
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

  let output = `Theme '${theme.name}' applied successfully`;
  if (theme.metadata?.author) {
    output += `\nAuthor: ${theme.metadata.author}`;
  }
  if (theme.hasBackgrounds) {
    output += `\nWallpapers available at: ~/.config/formalconf/current/backgrounds/`;
  }
  if (theme.isLightMode) {
    output += `\nNote: This is a light mode theme`;
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

export async function runSetTheme(themeName: string): Promise<SetThemeResult> {
  return applyTheme(themeName);
}

export { listThemes };

async function main() {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      info: { type: "boolean", short: "i" },
    },
    allowPositionals: true,
  });

  const [themeName] = positionals;

  if (!themeName) {
    const themes = await listThemes();

    if (themes.length === 0) {
      console.log(`${colors.yellow}No themes available.${colors.reset}`);
      console.log(`This system is compatible with omarchy themes.`);
      console.log(
        `\nAdd themes to: ${colors.cyan}~/.config/formalconf/themes/${colors.reset}`
      );
      process.exit(0);
    }

    console.log(`${colors.cyan}Usage: formalconf theme <theme-name>${colors.reset}`);
    console.log(`       formalconf theme --info <theme-name>\n`);
    console.log("Available themes:");
    for (const theme of themes) {
      const extras = [];
      if (theme.hasBackgrounds) extras.push("wallpapers");
      if (theme.isLightMode) extras.push("light");
      const suffix = extras.length
        ? ` ${colors.dim}(${extras.join(", ")})${colors.reset}`
        : "";
      console.log(`  ${colors.blue}•${colors.reset} ${theme.name}${suffix}`);
    }
    process.exit(0);
  }

  if (values.info) {
    await showThemeInfo(themeName);
  } else {
    const result = await applyTheme(themeName);
    console.log(
      result.success
        ? `${colors.green}${result.output}${colors.reset}`
        : `${colors.red}${result.output}${colors.reset}`
    );
  }
}

// Only run main when executed directly
const isMainModule = process.argv[1]?.includes("set-theme");
if (isMainModule) {
  main().catch(console.error);
}
