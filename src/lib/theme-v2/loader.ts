/**
 * JSON Theme Loader
 *
 * Loads and parses JSON theme files from the themes directory.
 */

import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { readText } from "../runtime";
import { THEMES_DIR } from "../paths";
import type {
  ThemeJson,
  ThemeMode,
  ThemeVariant,
  ThemeListItem,
  ThemeColorPalette,
} from "../../types/theme-schema";
import {
  validateThemeJson,
  formatValidationErrors,
  isValidThemeJson,
} from "./validator";

export class ThemeLoadError extends Error {
  constructor(
    public readonly path: string,
    message: string
  ) {
    super(`Failed to load theme at ${path}: ${message}`);
    this.name = "ThemeLoadError";
  }
}

export class ThemeValidationError extends Error {
  constructor(
    public readonly path: string,
    public readonly validationErrors: string
  ) {
    super(`Invalid theme at ${path}:\n${validationErrors}`);
    this.name = "ThemeValidationError";
  }
}

/**
 * Loads and parses a JSON theme file
 */
export async function loadThemeJson(themePath: string): Promise<ThemeJson> {
  if (!existsSync(themePath)) {
    throw new ThemeLoadError(themePath, "file not found");
  }

  let content: string;
  try {
    content = await readText(themePath);
  } catch (err) {
    throw new ThemeLoadError(
      themePath,
      `could not read file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new ThemeLoadError(
      themePath,
      `invalid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const validation = validateThemeJson(parsed);
  if (!validation.valid) {
    throw new ThemeValidationError(
      themePath,
      formatValidationErrors(validation.errors)
    );
  }

  return parsed as ThemeJson;
}

/**
 * Gets available modes for a theme based on which palettes exist
 */
export function getAvailableModes(theme: ThemeJson): ThemeMode[] {
  const modes: ThemeMode[] = [];
  if (theme.dark) modes.push("dark");
  if (theme.light) modes.push("light");
  return modes;
}

/**
 * Gets the active palette for a given mode
 */
export function getPalette(
  theme: ThemeJson,
  mode: ThemeMode
): ThemeColorPalette {
  const palette = mode === "dark" ? theme.dark : theme.light;
  if (!palette) {
    throw new Error(`Theme '${theme.title}' does not have a ${mode} palette`);
  }
  return palette;
}

/**
 * Creates a theme variant for a specific mode
 */
export function createThemeVariant(
  theme: ThemeJson,
  path: string,
  mode: ThemeMode
): ThemeVariant {
  return {
    theme,
    path,
    displayName: `${theme.title} (${mode})`,
    mode,
    palette: getPalette(theme, mode),
  };
}

/**
 * Lists all JSON theme files in the themes directory
 */
export async function listJsonThemes(): Promise<ThemeListItem[]> {
  if (!existsSync(THEMES_DIR)) {
    return [];
  }

  const entries = readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: ThemeListItem[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      const path = join(THEMES_DIR, entry.name);
      try {
        const theme = await loadThemeJson(path);
        themes.push({
          name: basename(entry.name, ".json"),
          path,
          theme,
          availableModes: getAvailableModes(theme),
        });
      } catch {
        // Skip invalid theme files
        continue;
      }
    }
  }

  return themes;
}

/**
 * Lists all theme variants (each mode as separate entry) for CLI/TUI display
 */
export async function listThemeVariants(): Promise<ThemeVariant[]> {
  const themes = await listJsonThemes();
  const variants: ThemeVariant[] = [];

  for (const item of themes) {
    for (const mode of item.availableModes) {
      variants.push(createThemeVariant(item.theme, item.path, mode));
    }
  }

  return variants;
}

/**
 * Finds a JSON theme by name
 */
export async function findThemeByName(
  name: string
): Promise<ThemeListItem | null> {
  const themes = await listJsonThemes();
  return themes.find((t) => t.name === name) ?? null;
}

/**
 * Checks if a path is a JSON theme file
 */
export function isJsonTheme(path: string): boolean {
  return path.endsWith(".json") && existsSync(path);
}

/**
 * Checks if the themes directory contains any JSON themes
 */
export async function hasJsonThemes(): Promise<boolean> {
  const themes = await listJsonThemes();
  return themes.length > 0;
}
