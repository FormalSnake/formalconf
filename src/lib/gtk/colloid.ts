/**
 * Colloid GTK Theme Integration
 *
 * Manages cloning, customizing, and installing the Colloid GTK theme
 * with FormalConf color palettes.
 */

import { existsSync } from "fs";
import { join } from "path";
import { COLLOID_DIR, GTK_DIR, ensureDir } from "../paths";
import { exec, commandExists, writeFile } from "../runtime";
import { getOS, getLinuxDistro } from "../platform";
import { generateColloidScss } from "./palette";
import type { ThemeJson, ThemeMode, ThemeColorPalette } from "../../types/theme-schema";
import type {
  GtkInstallOptions,
  GtkInstallResult,
  GtkDependencyCheck,
} from "./types";

const COLLOID_REPO_URL = "https://github.com/vinceliuice/Colloid-gtk-theme.git";

/**
 * Check if required dependencies are available
 */
export async function checkGtkDependencies(): Promise<GtkDependencyCheck> {
  const [git, sassc] = await Promise.all([
    commandExists("git"),
    commandExists("sassc"),
  ]);

  const missing: string[] = [];
  if (!git) missing.push("git");
  if (!sassc) missing.push("sassc");

  return { git, sassc, missing };
}

/**
 * Get dependency installation instructions for the current distro
 */
export async function getDependencyInstructions(
  missing: string[]
): Promise<string> {
  if (missing.length === 0) return "";

  const distro = await getLinuxDistro();
  const instructions: string[] = [];

  for (const dep of missing) {
    let instruction = `Missing: ${dep}\n`;
    switch (distro) {
      case "arch":
        instruction += `  Install: sudo pacman -S ${dep}`;
        break;
      case "debian":
      case "ubuntu":
        instruction += `  Install: sudo apt install ${dep}`;
        break;
      case "fedora":
        instruction += `  Install: sudo dnf install ${dep}`;
        break;
      case "opensuse":
        instruction += `  Install: sudo zypper install ${dep}`;
        break;
      default:
        instruction += `  Install via your package manager`;
    }
    instructions.push(instruction);
  }

  return instructions.join("\n");
}

/**
 * Clone Colloid repository (shallow clone for speed)
 */
async function cloneColloidRepo(): Promise<boolean> {
  await ensureDir(GTK_DIR);

  const result = await exec([
    "git",
    "clone",
    "--depth",
    "1",
    COLLOID_REPO_URL,
    COLLOID_DIR,
  ]);

  return result.success;
}

/**
 * Update existing Colloid repository
 */
async function updateColloidRepo(): Promise<boolean> {
  // Reset our modified palette file before pulling (we'll overwrite it anyway)
  await exec(["git", "checkout", "--", "src/sass/_color-palette-default.scss"], COLLOID_DIR);
  const result = await exec(["git", "pull", "--rebase"], COLLOID_DIR);
  return result.success;
}

/**
 * Ensure Colloid repository is available and up to date
 */
export async function ensureColloidRepo(): Promise<boolean> {
  if (existsSync(join(COLLOID_DIR, ".git"))) {
    // Repository exists, pull latest
    return updateColloidRepo();
  }

  // Clone fresh
  return cloneColloidRepo();
}

/**
 * Write custom color palette to Colloid's SCSS directory
 *
 * We overwrite _color-palette-default.scss because install.sh copies
 * _tweaks.scss to _tweaks-temp.scss which imports color-palette-default.
 * This ensures our colors are used without needing to patch the tweaks file.
 */
async function writeCustomPalette(
  palette: ThemeColorPalette,
  mode: ThemeMode
): Promise<void> {
  const scss = generateColloidScss(palette, mode);
  const palettePath = join(
    COLLOID_DIR,
    "src",
    "sass",
    "_color-palette-default.scss"
  );

  await writeFile(palettePath, scss);
}


/**
 * Run Colloid install.sh script
 */
async function runColloidInstall(options: GtkInstallOptions): Promise<number> {
  const args = [
    "./install.sh",
    "-n",
    `formalconf-${options.themeName}`,
    "-c",
    options.mode === "dark" ? "dark" : "light",
  ];

  // Add libadwaita flag if requested (default true)
  if (options.installLibadwaita !== false) {
    args.push("-l");
  }

  // Use blackness tweak for dark mode to get proper dark backgrounds
  // This makes Colloid use grey-900 instead of grey-700 for window_bg
  if (options.mode === "dark") {
    args.push("--tweaks", "black");
  }

  const result = await exec(args, COLLOID_DIR);
  return result.exitCode;
}

/**
 * Get the name of the installed GTK theme
 *
 * Colloid's install.sh uses the -n argument as-is, then appends the color variant.
 * So -n "formalconf-catppuccin" -c dark becomes "formalconf-catppuccin-Dark"
 */
function getGtkThemeName(
  themeName: string,
  mode: ThemeMode
): string {
  const modeCapitalized = mode === "dark" ? "Dark" : "Light";
  return `formalconf-${themeName}-${modeCapitalized}`;
}

/**
 * Apply GTK theme using FormalConf theme colors
 *
 * This is the main entry point for GTK theme integration.
 * It's called from applyJsonTheme() in set-theme.ts.
 */
export async function applyGtkTheme(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<GtkInstallResult> {
  // Skip on macOS
  if (getOS() !== "linux") {
    return {
      success: true,
      themeName: "",
      skipped: true,
      skipReason: "GTK theming only available on Linux",
    };
  }

  // Get the palette for the selected mode
  const palette = mode === "dark" ? theme.dark : theme.light;
  if (!palette) {
    return {
      success: false,
      themeName: "",
      error: `Theme does not have a ${mode} palette`,
    };
  }

  // Extract theme name from title (lowercase, no spaces)
  const themeName = theme.title.toLowerCase().replace(/\s+/g, "-");

  // Check dependencies
  const deps = await checkGtkDependencies();
  if (deps.missing.length > 0) {
    const instructions = await getDependencyInstructions(deps.missing);
    return {
      success: false,
      themeName: "",
      error: `Missing dependencies:\n${instructions}`,
    };
  }

  // Ensure Colloid repo is available
  const repoReady = await ensureColloidRepo();
  if (!repoReady) {
    return {
      success: false,
      themeName: "",
      error: "Failed to clone/update Colloid repository",
    };
  }

  // Write custom palette (overwrites _color-palette-default.scss)
  await writeCustomPalette(palette, mode);

  // Get GTK config from theme (optional)
  const gtkConfig = theme.gtk || {};

  // Build install options
  const options: GtkInstallOptions = {
    themeName,
    mode,
    variant: gtkConfig.variant,
    tweaks: gtkConfig.tweaks,
    installLibadwaita: true,
  };

  // Run install
  const exitCode = await runColloidInstall(options);
  if (exitCode !== 0) {
    return {
      success: false,
      themeName: "",
      error: `Colloid install.sh failed with exit code ${exitCode}`,
    };
  }

  const installedThemeName = getGtkThemeName(themeName, mode);

  // Apply theme via gsettings (GTK 3)
  const hasGsettings = await commandExists("gsettings");
  if (hasGsettings) {
    await exec([
      "gsettings",
      "set",
      "org.gnome.desktop.interface",
      "gtk-theme",
      installedThemeName,
    ]);
    await exec([
      "gsettings",
      "set",
      "org.gnome.desktop.interface",
      "color-scheme",
      `prefer-${mode}`,
    ]);
  }

  return {
    success: true,
    themeName: installedThemeName,
  };
}
