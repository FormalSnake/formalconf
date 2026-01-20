/**
 * Kvantum QT Theme Integration
 *
 * Manages generating and installing Kvantum themes with FormalConf color palettes.
 */

import { existsSync, copyFileSync } from "fs";
import { join } from "path";
import {
  QT_DIR,
  KVANTUM_CONFIG_DIR,
  KVANTUM_THEME_DIR,
  ensureDir,
} from "../paths";
import { commandExists, writeFile } from "../runtime";
import { getOS } from "../platform";
import { generateKvantumConfig } from "./palette";
import type { ThemeJson, ThemeMode } from "../../types/theme-schema";
import type { QtInstallResult, QtDependencyCheck } from "./types";

// System Kvantum themes directory
const SYSTEM_KVANTUM_DIR = "/usr/share/Kvantum";

// Setup reminder tracking
const SETUP_SHOWN_FILE = join(QT_DIR, ".setup-shown");

/**
 * Check if required QT dependencies are available
 */
export async function checkQtDependencies(): Promise<QtDependencyCheck> {
  const [kvantum, qt5ct, qt6ct] = await Promise.all([
    commandExists("kvantummanager"),
    commandExists("qt5ct"),
    commandExists("qt6ct"),
  ]);

  const missing: string[] = [];
  if (!kvantum) missing.push("kvantum");

  return { kvantum, qt5ct, qt6ct, missing };
}

/**
 * Check if the setup reminder has been shown before
 */
async function hasShownSetupReminder(): Promise<boolean> {
  return existsSync(SETUP_SHOWN_FILE);
}

/**
 * Mark the setup reminder as shown
 */
async function markSetupReminderShown(): Promise<void> {
  await ensureDir(QT_DIR);
  await writeFile(SETUP_SHOWN_FILE, new Date().toISOString());
}

/**
 * Get the base theme name and copy its SVG for widget styling
 */
function getBaseTheme(mode: ThemeMode): string {
  return mode === "dark" ? "KvFlat" : "KvFlatLight";
}

/**
 * Copy the base theme's SVG file for widget styling
 */
function copyBaseThemeSvg(baseTheme: string): boolean {
  const sourceSvg = join(SYSTEM_KVANTUM_DIR, baseTheme, `${baseTheme}.svg`);
  const targetSvg = join(KVANTUM_THEME_DIR, "FormalConf.svg");

  if (existsSync(sourceSvg)) {
    copyFileSync(sourceSvg, targetSvg);
    return true;
  }
  return false;
}

/**
 * Write the Kvantum theme configuration file
 */
async function writeKvantumTheme(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<void> {
  const palette = mode === "dark" ? theme.dark : theme.light;
  if (!palette) {
    throw new Error(`Theme does not have a ${mode} palette`);
  }

  await ensureDir(KVANTUM_THEME_DIR);

  // Determine base theme and copy its SVG for widget styling
  const baseTheme = getBaseTheme(mode);
  copyBaseThemeSvg(baseTheme);

  const config = generateKvantumConfig(palette, mode, baseTheme);
  const configPath = join(KVANTUM_THEME_DIR, "FormalConf.kvconfig");

  await writeFile(configPath, config);
}

/**
 * Write the Kvantum global config to set the active theme
 */
async function writeKvantumGlobalConfig(): Promise<void> {
  await ensureDir(KVANTUM_CONFIG_DIR);

  const globalConfig = `[General]
theme=FormalConf
`;

  const configPath = join(KVANTUM_CONFIG_DIR, "kvantum.kvconfig");
  await writeFile(configPath, globalConfig);
}

/**
 * Apply QT theme using Kvantum with FormalConf colors
 *
 * This is the main entry point for QT theme integration.
 * It's called from applyJsonTheme() in set-theme.ts.
 */
export async function applyQtTheme(
  theme: ThemeJson,
  mode: ThemeMode
): Promise<QtInstallResult> {
  // Skip on macOS
  if (getOS() !== "linux") {
    return {
      success: true,
      themeName: "",
      skipped: true,
      skipReason: "QT theming only available on Linux",
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

  // Check dependencies (soft-fail if Kvantum not installed)
  const deps = await checkQtDependencies();
  if (!deps.kvantum) {
    return {
      success: true,
      themeName: "",
      skipped: true,
      skipReason: "Kvantum not installed (install kvantum for QT theming)",
    };
  }

  try {
    // Write theme config
    await writeKvantumTheme(theme, mode);

    // Set as active theme
    await writeKvantumGlobalConfig();

    // Check if we need to show setup reminder
    const shownBefore = await hasShownSetupReminder();

    return {
      success: true,
      themeName: "FormalConf (Kvantum)",
      // Include setup hint for first-time users
      ...(!shownBefore && {
        error: undefined,
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      themeName: "",
      error: `Failed to write Kvantum theme: ${message}`,
    };
  }
}

/**
 * Get the setup reminder message (for first-time users)
 */
export function getQtSetupReminder(): string {
  return `Note: Add to your shell profile for QT apps to use Kvantum:
  export QT_QPA_PLATFORMTHEME=kvantum`;
}

/**
 * Check and mark setup reminder as shown
 * Returns the reminder message if it hasn't been shown, null otherwise
 */
export async function getAndMarkSetupReminder(): Promise<string | null> {
  const shown = await hasShownSetupReminder();
  if (shown) {
    return null;
  }

  await markSetupReminderShown();
  return getQtSetupReminder();
}
