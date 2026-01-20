/**
 * Theme Color Extractor
 *
 * Extracts color palettes from existing theme config files (Kitty, Alacritty, etc.)
 * to help migrate legacy themes to the JSON format.
 */

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { readText } from "../runtime";
import type { ThemeColorPalette, ThemeJson } from "../../types/theme-schema";

interface ExtractedColors {
  colors: Partial<ThemeColorPalette>;
  source: string;
}

/**
 * Normalizes a hex color to the format #RRGGBB
 */
function normalizeHex(hex: string): string {
  // Remove any leading # or 0x
  hex = hex.replace(/^(#|0x)/i, "");

  // Expand 3-digit hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  return `#${hex.toLowerCase()}`;
}

/**
 * Extracts colors from a Kitty config file
 */
async function extractFromKitty(path: string): Promise<ExtractedColors> {
  const content = await readText(path);
  const colors: Partial<ThemeColorPalette> = {};

  const colorMappings: Record<string, keyof ThemeColorPalette> = {
    foreground: "foreground",
    background: "background",
    cursor: "cursor",
    selection_foreground: "selection_foreground",
    selection_background: "selection_background",
    color0: "color0",
    color1: "color1",
    color2: "color2",
    color3: "color3",
    color4: "color4",
    color5: "color5",
    color6: "color6",
    color7: "color7",
    color8: "color8",
    color9: "color9",
    color10: "color10",
    color11: "color11",
    color12: "color12",
    color13: "color13",
    color14: "color14",
    color15: "color15",
  };

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(\w+)\s+(#?[0-9a-fA-F]{3,6})/);
    if (match) {
      const [, key, value] = match;
      if (key in colorMappings) {
        colors[colorMappings[key]] = normalizeHex(value);
      }
    }
  }

  return { colors, source: "kitty" };
}

/**
 * Extracts colors from an Alacritty config file (TOML format)
 */
async function extractFromAlacritty(path: string): Promise<ExtractedColors> {
  const content = await readText(path);
  const colors: Partial<ThemeColorPalette> = {};

  // Simple TOML-like parsing for color values
  const colorRegex = /(\w+)\s*=\s*["']?(#?[0-9a-fA-F]{3,6})["']?/g;

  // Map Alacritty color names to our palette
  const sectionMappings: Record<string, Record<string, keyof ThemeColorPalette>> = {
    "colors.primary": {
      background: "background",
      foreground: "foreground",
    },
    "colors.cursor": {
      cursor: "cursor",
    },
    "colors.selection": {
      background: "selection_background",
      foreground: "selection_foreground",
    },
    "colors.normal": {
      black: "color0",
      red: "color1",
      green: "color2",
      yellow: "color3",
      blue: "color4",
      magenta: "color5",
      cyan: "color6",
      white: "color7",
    },
    "colors.bright": {
      black: "color8",
      red: "color9",
      green: "color10",
      yellow: "color11",
      blue: "color12",
      magenta: "color13",
      cyan: "color14",
      white: "color15",
    },
  };

  let currentSection = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Track sections
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Extract color values
    const colorMatch = trimmed.match(/^(\w+)\s*=\s*["']?(#?[0-9a-fA-F]{3,6})["']?/);
    if (colorMatch && currentSection in sectionMappings) {
      const [, key, value] = colorMatch;
      const sectionMap = sectionMappings[currentSection];
      if (key in sectionMap) {
        colors[sectionMap[key]] = normalizeHex(value);
      }
    }
  }

  return { colors, source: "alacritty" };
}

/**
 * Extracts colors from a Ghostty theme file
 */
async function extractFromGhostty(path: string): Promise<ExtractedColors> {
  const content = await readText(path);
  const colors: Partial<ThemeColorPalette> = {};

  const mappings: Record<string, keyof ThemeColorPalette> = {
    foreground: "foreground",
    background: "background",
    "cursor-color": "cursor",
    "selection-foreground": "selection_foreground",
    "selection-background": "selection_background",
  };

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Handle palette = N=RRGGBB format
    const paletteMatch = trimmed.match(/^palette\s*=\s*(\d+)=([0-9a-fA-F]{6})/);
    if (paletteMatch) {
      const [, index, value] = paletteMatch;
      const colorKey = `color${index}` as keyof ThemeColorPalette;
      if (parseInt(index) <= 15) {
        colors[colorKey] = normalizeHex(value);
      }
      continue;
    }

    // Handle other color settings
    const colorMatch = trimmed.match(/^([\w-]+)\s*=\s*([0-9a-fA-F]{6})/);
    if (colorMatch) {
      const [, key, value] = colorMatch;
      if (key in mappings) {
        colors[mappings[key]] = normalizeHex(value);
      }
    }
  }

  return { colors, source: "ghostty" };
}

/**
 * Auto-detects file type and extracts colors
 */
export async function extractColors(filePath: string): Promise<ExtractedColors | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  const filename = filePath.toLowerCase();

  if (filename.includes("kitty") || filename.endsWith(".conf")) {
    const content = await readText(filePath);
    // Check if it looks like a kitty config
    if (content.includes("foreground") && content.includes("color0")) {
      return extractFromKitty(filePath);
    }
  }

  if (filename.includes("alacritty") || filename.endsWith(".toml")) {
    return extractFromAlacritty(filePath);
  }

  if (filename.includes("ghostty")) {
    return extractFromGhostty(filePath);
  }

  // Try kitty format as fallback for .conf files
  if (filename.endsWith(".conf")) {
    return extractFromKitty(filePath);
  }

  return null;
}

/**
 * Extracts colors from a legacy theme directory
 */
export async function extractFromLegacyTheme(
  themePath: string
): Promise<ExtractedColors | null> {
  if (!existsSync(themePath)) {
    return null;
  }

  const files = readdirSync(themePath, { withFileTypes: true });

  // Try different config files in order of preference
  const preferredFiles = [
    "kitty.conf",
    "alacritty.toml",
    "ghostty.conf",
  ];

  for (const preferred of preferredFiles) {
    const match = files.find((f) => f.name.toLowerCase() === preferred.toLowerCase());
    if (match) {
      return extractColors(join(themePath, match.name));
    }
  }

  // Try any .conf or .toml file
  for (const file of files) {
    if (file.isFile() && (file.name.endsWith(".conf") || file.name.endsWith(".toml"))) {
      const result = await extractColors(join(themePath, file.name));
      if (result && Object.keys(result.colors).length > 0) {
        return result;
      }
    }
  }

  return null;
}

/**
 * Validates that a palette has all required colors
 */
export function validatePalette(colors: Partial<ThemeColorPalette>): string[] {
  const required: (keyof ThemeColorPalette)[] = [
    "color0", "color1", "color2", "color3", "color4", "color5", "color6", "color7",
    "color8", "color9", "color10", "color11", "color12", "color13", "color14", "color15",
    "background", "foreground", "cursor",
  ];

  const missing: string[] = [];
  for (const key of required) {
    if (!colors[key]) {
      missing.push(key);
    }
  }

  return missing;
}

/**
 * Creates a complete palette by filling in missing values with defaults
 */
export function fillMissingColors(
  colors: Partial<ThemeColorPalette>
): ThemeColorPalette {
  const defaults: ThemeColorPalette = {
    color0: "#000000",
    color1: "#cc0000",
    color2: "#4e9a06",
    color3: "#c4a000",
    color4: "#3465a4",
    color5: "#75507b",
    color6: "#06989a",
    color7: "#d3d7cf",
    color8: "#555753",
    color9: "#ef2929",
    color10: "#8ae234",
    color11: "#fce94f",
    color12: "#739fcf",
    color13: "#ad7fa8",
    color14: "#34e2e2",
    color15: "#eeeeec",
    background: "#1e1e1e",
    foreground: "#d4d4d4",
    cursor: "#ffffff",
  };

  return {
    ...defaults,
    ...colors,
    selection_background: colors.selection_background ?? colors.color0 ?? defaults.color0,
    selection_foreground: colors.selection_foreground ?? colors.foreground ?? defaults.foreground,
    accent: colors.accent ?? colors.color4 ?? defaults.color4,
    border: colors.border ?? colors.color0 ?? defaults.color0,
  };
}

/**
 * Generates a ThemeJson object from extracted colors
 */
export function generateThemeJson(
  name: string,
  colors: Partial<ThemeColorPalette>,
  options: {
    author?: string;
    description?: string;
    isLight?: boolean;
  } = {}
): ThemeJson {
  const palette = fillMissingColors(colors);

  const theme: ThemeJson = {
    title: name,
    description: options.description,
    author: options.author,
    version: "1.0.0",
  };

  if (options.isLight) {
    theme.light = palette;
  } else {
    theme.dark = palette;
  }

  return theme;
}
