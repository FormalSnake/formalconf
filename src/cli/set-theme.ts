import { parseArgs } from "util";
import { readdirSync, existsSync } from "fs";
import { THEMES_DIR, THEME_TARGET_DIR, ensureConfigDir } from "../lib/paths";
import type { Theme } from "../types/theme";

const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  blue: "\x1b[0;34m",
  yellow: "\x1b[1;33m",
  cyan: "\x1b[0;36m",
  reset: "\x1b[0m",
};

async function listThemes(): Promise<Theme[]> {
  const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: Theme[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const themePath = `${THEMES_DIR}/${entry.name}`;
      const files = readdirSync(themePath, { withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => ({
          name: f.name,
          path: `${themePath}/${f.name}`,
          application: f.name.replace(/\.(conf|theme|lua)$/, ""),
        }));

      themes.push({
        name: entry.name,
        path: themePath,
        files,
      });
    }
  }

  return themes;
}

async function applyTheme(themeName: string): Promise<void> {
  const themeDir = `${THEMES_DIR}/${themeName}`;

  if (!existsSync(themeDir)) {
    console.error(`${colors.red}Error: Theme '${themeName}' not found${colors.reset}`);
    process.exit(1);
  }

  await ensureConfigDir();

  // Clear existing symlinks
  await Bun.$`rm -rf ${THEME_TARGET_DIR}/*`.quiet();

  // Create new symlinks
  const files = readdirSync(themeDir, { withFileTypes: true }).filter((f) =>
    f.isFile()
  );

  for (const file of files) {
    const source = `${themeDir}/${file.name}`;
    const target = `${THEME_TARGET_DIR}/${file.name}`;
    await Bun.$`ln -sf ${source} ${target}`.quiet();
  }

  console.log(`${colors.green}Theme '${themeName}' applied successfully${colors.reset}`);
}

async function main() {
  const { positionals } = parseArgs({
    args: Bun.argv.slice(2),
    allowPositionals: true,
  });

  const [themeName] = positionals;

  if (!themeName) {
    console.log(`${colors.cyan}Usage: bun run theme <theme-name>${colors.reset}\n`);
    console.log("Available themes:");
    const themes = await listThemes();
    for (const theme of themes) {
      console.log(`  ${colors.blue}•${colors.reset} ${theme.name}`);
    }
    process.exit(0);
  }

  await applyTheme(themeName);
}

main().catch(console.error);
