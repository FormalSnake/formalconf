import { parseArgs } from "util";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import {
  THEMES_DIR,
  THEME_TARGET_DIR,
  BACKGROUNDS_TARGET_DIR,
  ensureConfigDir,
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

async function applyTheme(themeName: string): Promise<void> {
  const themeDir = join(THEMES_DIR, themeName);

  if (!existsSync(themeDir)) {
    console.error(
      `${colors.red}Error: Theme '${themeName}' not found${colors.reset}`
    );
    process.exit(1);
  }

  await ensureConfigDir();

  const theme = await parseTheme(themeDir, themeName);

  // Clear existing symlinks
  await Bun.$`rm -rf ${THEME_TARGET_DIR}/*`.quiet();
  await Bun.$`rm -rf ${BACKGROUNDS_TARGET_DIR}`.quiet();

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
      await Bun.$`ln -sf ${source} ${target}`.quiet();
    }
  }

  // Symlink backgrounds directory if present
  if (theme.hasBackgrounds) {
    const backgroundsSource = join(themeDir, "backgrounds");
    await Bun.$`ln -sf ${backgroundsSource} ${BACKGROUNDS_TARGET_DIR}`.quiet();
  }

  console.log(
    `${colors.green}Theme '${theme.name}' applied successfully${colors.reset}`
  );

  if (theme.metadata?.author) {
    console.log(`${colors.dim}Author: ${theme.metadata.author}${colors.reset}`);
  }

  if (theme.hasBackgrounds) {
    console.log(
      `${colors.cyan}Wallpapers available at: ~/.config/formalconf/current/backgrounds/${colors.reset}`
    );
  }

  if (theme.isLightMode) {
    console.log(
      `${colors.yellow}Note: This is a light mode theme${colors.reset}`
    );
  }
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

async function main() {
  const { positionals, values } = parseArgs({
    args: Bun.argv.slice(2),
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

    console.log(`${colors.cyan}Usage: bun run theme <theme-name>${colors.reset}`);
    console.log(`       bun run theme --info <theme-name>\n`);
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
    await applyTheme(themeName);
  }
}

main().catch(console.error);
